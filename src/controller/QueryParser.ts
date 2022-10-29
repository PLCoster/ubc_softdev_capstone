import {
    InsightDatasetKind,
    InsightQueryAST,
    InsightQueryASTApplyObject,
    InsightAggregatorKind,
    InsightEBNFQuery,
} from "./IInsightFacade";
import { OrderDirection } from "./DatasetQuerier";
import { QuerySectionREs } from "./helpers/queryParserRegExs";

import { IFilter, ALLFilter, NOTFilter, ANDFilter, ORFilter } from "./filters";
import Log from "../Util";

import {
    cQueryRE,
    rQueryRE,
    reservedRE,
    courseQuerySectionREs,
    roomsQuerySectionREs,
} from "./helpers/queryParserRegExs";
import { conditionStringToIFilterInfo } from "./helpers/conditionStringToIFilterInfo";
import { queryAggNameToIAggregatorInfo } from "./helpers/queryAggNameToIAggregatorInfo";

const strQueryColNamesToKeyAndType: {
    [key in InsightDatasetKind]: {
        [key: string]: { key: string; type: "numeric" | "string" };
    };
} = {
    courses: {
        Audit: { key: "audit", type: "numeric" },
        Average: { key: "avg", type: "numeric" },
        Department: { key: "dept", type: "string" },
        Fail: { key: "fail", type: "numeric" },
        ID: { key: "id", type: "string" },
        Instructor: { key: "instructor", type: "string" },
        Pass: { key: "pass", type: "numeric" },
        Title: { key: "title", type: "string" },
        UUID: { key: "uuid", type: "string" },
        Year: { key: "year", type: "numeric" },
    },
    rooms: {
        "Full Name": { key: "fullname", type: "string" },
        "Short Name": { key: "shortname", type: "string" },
        "Number": { key: "number", type: "string" },
        "Name": { key: "name", type: "string" },
        "Address": { key: "address", type: "string" },
        "Type": { key: "type", type: "string" },
        "Furniture": { key: "furniture", type: "string" },
        "Link": { key: "href", type: "string" },
        "Latitude": { key: "lat", type: "numeric" },
        "Longitude": { key: "lon", type: "numeric" },
        "Seats": { key: "seats", type: "numeric" },
    },
};

// Produce flat object of mappings from String Query Column Name to Query Key
// !!! Refactor alongside String Query Parser Refactoring
const queryColNameStrToKeyStr: { [key: string]: string } = (() => {
    const result: { [key: string]: string } = {};
    Object.keys(strQueryColNamesToKeyAndType).forEach(
        (kind: InsightDatasetKind) => {
            Object.entries(strQueryColNamesToKeyAndType[kind]).forEach(
                ([strQueryColName, { key: colQueryKey }]) => {
                    result[strQueryColName] = colQueryKey;
                },
            );
        },
    );

    return result;
})();

export default class QueryParser {
    constructor() {
        Log.trace("QueryParser::init()");
    }

    public parseQuery(queryStr: string): InsightQueryAST {
        // Try to match queryStr as valid courses or rooms dataset query
        let queryMatchObj: RegExpMatchArray;
        let querySectionREs: QuerySectionREs;
        if (cQueryRE.test(queryStr)) {
            queryMatchObj = queryStr.match(cQueryRE);
            querySectionREs = courseQuerySectionREs;
        } else if (rQueryRE.test(queryStr)) {
            queryMatchObj = queryStr.match(rQueryRE);
            querySectionREs = roomsQuerySectionREs;
        } else {
            // No matches for courses or rooms query - invalid query
            this.rejectQuery(`Invalid Query: incorrect query syntax`);
        }

        const {
            groups: {
                DATASET: datasetStr,
                FILTER: filterStr,
                GROUPBY: groupStr,
                APPLY: applyStr,
                DISPLAY: displayStr,
                ORDER: orderStr,
            },
        } = queryMatchObj;

        // Parse DATASET, FILTER(S), DISPLAY and ORDER sections of query
        const { id, kind } = this.parseDataset(datasetStr, querySectionREs);
        const filter = this.parseFilters(filterStr, id, querySectionREs);
        const display = this.parseDisplayOrGroupBy(
            displayStr,
            id,
            querySectionREs,
            groupStr ? true : false,
            false,
        );

        const queryAST: InsightQueryAST = {
            id,
            kind,
            filter,
            groupby: null,
            apply: null,
            display,
            order: null,
        };

        if (groupStr) {
            queryAST.groupby = this.parseDisplayOrGroupBy(
                groupStr,
                id,
                querySectionREs,
                true,
                true,
            );
        }

        if (applyStr) {
            if (!groupStr) {
                this.rejectQuery(`APPLY is only possible for GROUPBY queries`);
            }

            queryAST.apply = this.parseApply(applyStr, id, querySectionREs);
        }

        if (orderStr) {
            queryAST.order = this.parseOrder(
                orderStr,
                id,
                display,
                querySectionREs,
            );
        }

        this.astHasValidSemantics(queryAST, querySectionREs);
        return queryAST;
    }

    // Translates an EBNF Query Object to InsightQueryAST for DataQuerier
    public translateEBNFQuery(query: InsightEBNFQuery): InsightQueryAST {
        const { ID: id, KIND: kind } = query;

        // Validate id and kind
        if (id.includes("_") || id.includes(" ") || reservedRE.test(id)) {
            this.rejectQuery(
                `Invalid Query: Dataset ID cannot contain '_', ' ' or equal RESERVED, got: ${id}`,
            );
        }

        if (!Object.values(InsightDatasetKind).includes(kind)) {
            this.rejectQuery(
                `Invalid Query: Dataset KIND must be 'courses' or 'rooms', got: ${kind}`,
            );
        }

        const filter = this.parseWHERE(query.WHERE);
        const display = query.OPTIONS.COLUMNS;

        if (!display.length) {
            this.rejectQuery(`Invalid Query: No COLUMNS selected for display`);
        }

        // Begin constructing QueryAST
        const queryAST: InsightQueryAST = {
            id,
            kind,
            filter,
            groupby: null,
            apply: null,
            display,
            order: null,
        };

        if (query.OPTIONS.ORDER) {
            queryAST.order = this.parseORDER(query.OPTIONS.ORDER);
        }

        // Query desires Grouping
        if (query.TRANSFORMATIONS && query.TRANSFORMATIONS.GROUP) {
            queryAST.groupby = query.TRANSFORMATIONS.GROUP;

            if (query.TRANSFORMATIONS.APPLY) {
                queryAST.apply = this.parseAPPLY(
                    id,
                    kind,
                    query.TRANSFORMATIONS.APPLY,
                );
            }
        }

        return queryAST;
    }

    // Extracts Dataset INPUT(id) and KIND from query string
    private parseDataset(
        datasetStr: string,
        querySectionREs: QuerySectionREs,
    ): {
        id: string;
        kind: InsightDatasetKind;
    } {
        const datasetMatchObj = datasetStr.match(querySectionREs.inputKindRE);

        if (!datasetMatchObj) {
            this.rejectQuery(
                "Invalid Query: DATASET KIND or INPUT not recognised",
            );
        }

        const id: string = datasetMatchObj.groups.INPUT;
        const kind = datasetMatchObj.groups.KIND as InsightDatasetKind;

        // Ensure that dataset id does not contain underscore char or is RESERVED string
        if (id.includes("_") || reservedRE.test(id)) {
            this.rejectQuery(
                `Invalid Query: DATASET INPUT (${id}) cannot contain underscore or equal RESERVED strings`,
            );
        }

        return { id, kind };
    }

    // Extracts FILTER(s) from query string, builds AST for filters:
    private parseFilters(
        filterStr: string,
        id: string,
        querySectionREs: QuerySectionREs,
    ): IFilter {
        if (filterStr === "find all entries") {
            return new ALLFilter();
        }

        // Otherwise at least one query filter is specified
        // Trim off 'find entries whose ' from start of filterStr
        filterStr = filterStr.slice(19);

        // Determine number of filters present:
        const filterOperatorArr = filterStr
            .split(
                new RegExp(`(${querySectionREs.singleFilterRE.source}|and|or)`),
            )
            .filter((str) => str.length > 1);

        if (!filterOperatorArr.length) {
            this.rejectQuery(
                `Invalid Query: could not parse FILTER section correctly`,
            );
        }

        // Build and Return Filter
        return this.buildFilters(
            filterOperatorArr,
            id,
            filterOperatorArr.length - 1,
            querySectionREs,
        );
    }

    // Extracts DISPLAY or GROUPBY keys from query string:
    private parseDisplayOrGroupBy(
        sectionStr: string,
        id: string,
        querySectionREs: QuerySectionREs,
        hasGroupBy: boolean,
        parseGroupBy: boolean,
    ): string[] {
        const sectionColNames = sectionStr.split(/, | and /);
        const numCols = sectionColNames.length;

        const sectionCols = new Set<string>();

        sectionColNames.forEach((colName) => {
            // Check Column Name is valid, (existing column or valid AGG column name)
            if (querySectionREs.colNameRE.test(colName)) {
                // Valid normal column name
                sectionCols.add(`${id}_${queryColNameStrToKeyStr[colName]}`);
            } else {
                // GROUPBY section cannot contain custom aggregator names
                if (parseGroupBy) {
                    this.rejectQuery(
                        `Invalid column name in GROUPBY: ${colName}`,
                    );
                }

                // DISPLAY section cannot contain custom names when no GROUPBY section
                if (!parseGroupBy && !hasGroupBy) {
                    this.rejectQuery(
                        `Invalid column name in DISPLAY: ${colName}`,
                    );
                }

                // DISPLAY Section can contain allowed APPLY aggregator names
                if (
                    colName.includes("_") ||
                    colName.includes(" ") ||
                    reservedRE.test(colName)
                ) {
                    // Invalid APPLY column name
                    this.rejectQuery(
                        `APPLY column names must not contain "_", " " or RESERVED, found ${colName}`,
                    );
                }
                sectionCols.add(colName);
            }
        });

        // If we have no column names, to display then throw an error:
        if (!sectionCols.size) {
            this.rejectQuery(
                `Invalid Query: invalid DISPLAY/GROUPBY, no column names specified "${sectionStr}"`,
            );
        }

        return Array.from(sectionCols);
    }

    // Extracts ORDER from query string
    private parseOrder(
        orderStr: string,
        id: string,
        displayKeys: string[],
        querySectionREs: QuerySectionREs,
    ): { direction: OrderDirection; keys: string[] } {
        const orderMatchObj = orderStr.match(
            querySectionREs.sortDirectionColRE,
        );

        if (!orderMatchObj) {
            this.rejectQuery(`Invalid ORDER query section: ${orderStr}`);
        }

        const ordering =
            orderMatchObj.groups.DIRECTION === "ascending"
                ? OrderDirection.asc
                : OrderDirection.desc;

        // Extract valid DataObj keys or custom Agg keys from query ORDER column names
        const orderKeys = orderMatchObj.groups.COLNAMES.split(/, | and /).map(
            (colName) => {
                if (querySectionREs.colNameRE.test(colName)) {
                    return `${id}_${queryColNameStrToKeyStr[colName]}`;
                } else {
                    // Custom Aggregator Name for Ordering
                    if (
                        colName.includes("_") ||
                        colName.includes(" ") ||
                        reservedRE.test(colName)
                    ) {
                        // Invalid APPLY column name
                        this.rejectQuery(
                            `APPLY column names must not contain "_", " " or RESERVED, found ${colName} in ORDER`,
                        );
                    }
                    return colName;
                }
            },
        );

        // Check query semantics - we can only sort by a key that is being displayed:
        // !!! We should not have multiple identical order keys (? Not in UI SPEC)
        const orderKeySet = new Set<string>();
        orderKeys.forEach((orderKey) => {
            if (!displayKeys.includes(orderKey)) {
                this.rejectQuery(
                    `Invalid ORDER semantics - column ${orderKey} not selected in DISPLAY`,
                );
            } else if (orderKeySet.has(orderKey)) {
                this.rejectQuery(
                    `Invalid ORDER semantics - ordering by column ${orderKey} multiple times`,
                );
            }
            orderKeySet.add(orderKey);
        });

        return { direction: ordering, keys: orderKeys };
    }

    // Extracts APPLY (aggregations) from query string:
    private parseApply(
        applyStr: string,
        id: string,
        querySectionREs: QuerySectionREs,
    ): InsightQueryASTApplyObject[] {
        const aggregators = applyStr.split(/, | and /);

        const aggNames = new Set<string>(); // Each aggregation must have a unique name
        const applyDetails: InsightQueryASTApplyObject[] = [];

        // Extract the agg name, operation and key:
        aggregators.forEach((aggStr) => {
            const aggMatchObject = aggStr.match(querySectionREs.aggNameOpColRE);

            // If no match, throw an error:
            if (!aggMatchObject) {
                this.rejectQuery(`Bad Aggregation Syntax found: ${aggStr}`);
            }

            const {
                NAME: aggName,
                OPERATION: aggOp,
                COLNAME: aggCol,
            } = aggMatchObject.groups;

            // If we have a duplicate name for an agg, error:
            if (aggNames.has(aggName)) {
                this.rejectQuery(
                    `Multiple Identical Aggregation Names found: ${aggName}`,
                );
            }

            const { Aggregator, aggType } =
                queryAggNameToIAggregatorInfo[aggOp as InsightAggregatorKind];

            // Confirm that aggregation type matches column type:
            const colTypeRE = querySectionREs.colTypeREs[aggType];
            if (!colTypeRE.test(aggCol)) {
                this.rejectQuery(
                    `Aggregator ${aggName} cannot be used with ${aggType} column ${aggCol}`,
                );
            }

            aggNames.add(aggName);
            applyDetails.push({
                name: aggName,
                operation: new Aggregator(
                    aggName,
                    `${id}_${queryColNameStrToKeyStr[aggCol]}`,
                ),
                colName: aggCol,
            });
        });

        return applyDetails;
    }

    // Builds up the nested filter object based on query filter criteria:
    private buildFilters(
        filterOperatorArr: string[],
        id: string,
        currentIndex: number,
        querySectionREs: QuerySectionREs,
    ): IFilter {
        // If we only have a single filter, just build and return that single filter
        if (currentIndex === 0) {
            return this.buildSingleFilter(
                filterOperatorArr[0],
                id,
                querySectionREs,
            );
        }

        // Otherwise build left and right filters and combine with logical filter
        const rightFilter = this.buildSingleFilter(
            filterOperatorArr[currentIndex],
            id,
            querySectionREs,
        );

        const logicalFilter =
            filterOperatorArr[currentIndex - 1] === "and"
                ? ANDFilter
                : ORFilter;

        const leftFilter = this.buildFilters(
            filterOperatorArr,
            id,
            currentIndex - 2,
            querySectionREs,
        );

        return new logicalFilter(leftFilter, rightFilter);
    }

    // Builds and returns a single IFilter based on the filter criteria:
    private buildSingleFilter(
        filterStr: string,
        id: string,
        querySectionREs: QuerySectionREs,
    ): IFilter {
        // Parse relevant information from the filterstring:
        const filterMatchObj = filterStr.match(querySectionREs.filterDetailRE);

        if (!filterMatchObj) {
            this.rejectQuery(`Invalid filter syntax: ${filterStr}`);
        }

        const {
            groups: { COLNAME: colname, CONDITION: condition, VALUE: value },
        } = filterMatchObj;

        const { filter, valueParser, negation } =
            conditionStringToIFilterInfo[condition];

        const conditionKey = `${id}_${queryColNameStrToKeyStr[colname]}`;
        const conditionValue = valueParser(value);

        let builtFilter: IFilter = new filter(conditionKey, conditionValue);

        // If this filter is a negation, then wrap filter inside a NOT filter:
        if (negation) {
            builtFilter = new NOTFilter(builtFilter);
        }

        return builtFilter;
    }

    // Calls rejectQuery if query has invalid Semantics:
    private astHasValidSemantics(
        queryAST: InsightQueryAST,
        querySectionREs: QuerySectionREs,
    ): boolean {
        // If query has GROUPBY section, can only DISPLAY grouped/agg cols:
        if (queryAST.groupby) {
            // Get all agg Column Names
            const aggColNames = queryAST.apply
                ? queryAST.apply.map((applyDetails) => applyDetails.name)
                : [];
            queryAST.display.forEach((colName: string) => {
                if (
                    !queryAST.groupby.includes(colName) &&
                    !aggColNames.includes(colName)
                ) {
                    return this.rejectQuery(
                        `Invalid DISPLAY semantics when GROUPING - ${colName} not in GROUPBY or AGG`,
                    );
                }
            });
        }

        return true;
    }

    /**
     * Parses the WHERE section of EBNF Query Object
     * Returns an IFilter representing the given combination of Filters
     *
     * @param whereObj the nested WHERE (FILTER) Object from the EBNF Query Object
     */
    private parseWHERE(whereObj: any): IFilter {
        // If no Filter conditions, return all rows
        if (Object.keys(whereObj).length === 0) {
            return new ALLFilter();
        }

        // !!! Implement complete filter building
        return new ALLFilter();
    }

    /**
     * Parses the ORDER section of EBNF Query Object
     * Returns a Query AST 'order' object for DatasetQuerier
     *
     * @param orderObj the ORDER section of the EBNF Query
     */
    private parseORDER(
        orderObj: string | { dir: "UP" | "DOWN"; keys: string[] },
    ): {
        direction: OrderDirection;
        keys: string[];
    } {
        if (typeof orderObj === "string") {
            return { direction: OrderDirection.asc, keys: [orderObj] };
        }

        const { dir, keys } = orderObj;

        if (dir === "UP") {
            return { direction: OrderDirection.asc, keys };
        } else {
            return { direction: OrderDirection.desc, keys };
        }
    }

    /**
     * Parses the APPLY section of EBNF Query Object
     * Returns a Query AST 'apply' Array of InsightQueryASTApplyObject for DataQuerier
     *
     * @param id id of the dataset we are applying the query to
     * @param kind the dataset kind we are applying the query to
     * @param applyArr the APPLY section of the EBNF Query
     */
    private parseAPPLY(
        id: string,
        kind: InsightDatasetKind,
        applyARR: Array<{
            [key: string]: { [key in InsightAggregatorKind]: string };
        }>,
    ): InsightQueryASTApplyObject[] {
        const applyObjArr: InsightQueryASTApplyObject[] = [];

        applyARR.forEach((apply) => {
            const name = Object.keys(apply)[0];
            const aggName = Object.keys(
                apply[name],
            )[0] as InsightAggregatorKind;

            // Check Aggregation Name is Valid
            if (!Object.values(InsightAggregatorKind).includes(aggName)) {
                this.rejectQuery(
                    `Invalid Query: Unrecognised Aggregation Operation: ${aggName}`,
                );
            }

            const aggInfo = queryAggNameToIAggregatorInfo[aggName];
            const colName = apply[name][aggName];

            // Check the name of the column to be aggregated is valid
            const [strColName, { key: colKey, type: colType }] =
                this.validateEBNFColName(id, kind, colName);

            const operation = new aggInfo.Aggregator(name, colName);

            // Ensure the aggregation operation is valid for the given column:
            if (aggInfo.aggType === "numeric" && colType !== "numeric") {
                this.rejectQuery(
                    `Invalid Query: Aggregation type ${aggName} cannot be applied to ${strColName} column`,
                );
            }

            applyObjArr.push({ name, operation, colName });
        });

        return applyObjArr;
    }

    /**
     * Helper function to validate that a given column name in EBNF Query Qbject is valid
     * e.g. courses_avg is valid for a 'courses' kind dataset, where courses_furniture
     * would be invalid
     * @param id the id of the dataset that is being queried
     * @param kind the dataset kind of the dataset being queried (courses | rooms)
     * @param queryColName the column name in the EBNF Query Object
     */
    private validateEBNFColName(
        id: string,
        kind: InsightDatasetKind,
        queryColName: string,
    ) {
        const nameSections = queryColName.split("_");

        if (nameSections.length !== 2) {
            this.rejectQuery(
                `Invalid Query: Invalid column name in Query: ${queryColName}`,
            );
        }

        const [colID, colName] = nameSections;

        if (colID !== id) {
            this.rejectQuery(
                `Invalid Query: Invalid column name ${queryColName} for dataset id ${id}`,
            );
        }

        // Check that the colName is valid for the dataset kind
        const validColNames = Object.entries(
            strQueryColNamesToKeyAndType[kind],
        );

        const colMatch = validColNames.filter(
            ([stringColName, { key, type }]) => {
                return key === colName;
            },
        );

        if (!colMatch.length) {
            this.rejectQuery(
                `Invalid Query: Invalid column name ${queryColName} for dataset kind ${kind}`,
            );
        }

        // Otherwise the column name is valid for dataset id and kind, return info:
        return colMatch[0];
    }

    private rejectQuery(message: string) {
        throw new Error(`queryParser.parseQuery ERROR: ${message}`);
    }
}
