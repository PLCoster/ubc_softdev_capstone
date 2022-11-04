import {
    InsightDatasetKind,
    InsightQueryAST,
    InsightQueryASTApplyObject,
    InsightAggregatorKind,
    InsightEBNFQueryOrderObject,
    InsightEBNFQueryOrderDir,
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
import {
    conditionStringToIFilterInfo,
    conditionKeyToIFilterInfo,
} from "./helpers/conditionStringToIFilterInfo";
import { queryAggNameToIAggregatorInfo } from "./helpers/queryAggNameToIAggregatorInfo";

const strQueryColNamesToKeyAndType: {
    [key in InsightDatasetKind]: {
        [key: string]: { key: string; type: "number" | "string" };
    };
} = {
    courses: {
        Audit: { key: "audit", type: "number" },
        Average: { key: "avg", type: "number" },
        Department: { key: "dept", type: "string" },
        Fail: { key: "fail", type: "number" },
        ID: { key: "id", type: "string" },
        Instructor: { key: "instructor", type: "string" },
        Pass: { key: "pass", type: "number" },
        Title: { key: "title", type: "string" },
        UUID: { key: "uuid", type: "string" },
        Year: { key: "year", type: "number" },
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
        "Latitude": { key: "lat", type: "number" },
        "Longitude": { key: "lon", type: "number" },
        "Seats": { key: "seats", type: "number" },
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
        // First check that the Query Object is valid - will reject if invalid
        this.validateEBNFQuery(query);

        const { ID: id, KIND: kind } = query;

        const filter = this.parseWHERE(query.WHERE);
        Log.trace(filter.toString());
        const display = query.OPTIONS.COLUMNS;

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
     * Helper method to check that EBNF Query Object is valid before
     * building the query from it.
     *
     * If the query is not valid the method throws an error by calling
     * the rejectQuery() method
     *
     * @param query EBNF Query Object to be validated
     */
    private validateEBNFQuery(query: InsightEBNFQuery): boolean {
        // Validate Dataset Name
        if (!query.ID || typeof query.ID !== "string") {
            this.rejectQuery(`Invalid Query: No Dataset ID was given`);
        }

        const queryID: string = query.ID;

        // Validate id and kind
        if (
            queryID.includes("_") ||
            queryID.includes(" ") ||
            reservedRE.test(queryID)
        ) {
            this.rejectQuery(
                `Invalid Query: Dataset ID cannot contain '_', ' ' or equal RESERVED, got: ${queryID}`,
            );
        }

        // Validate Dataset Kind
        if (!Object.values(InsightDatasetKind).includes(query.KIND)) {
            this.rejectQuery(
                `Invalid Query: Dataset KIND can only be 'courses' or 'rooms', got: ${query.KIND}`,
            );
        }

        // Validate WHERE Section of query
        if (!query.WHERE || typeof query.WHERE !== "object") {
            this.rejectQuery(
                `Invalid Query: Query contained no valid WHERE section - include WHERE:{} if no filters are required`,
            );
        }

        // Recursively validate all of WHERE
        this.validateWhere(queryID, query.KIND, query.WHERE);

        // Validate COLUMNS Section of query
        if (
            !query.OPTIONS ||
            !query.OPTIONS.COLUMNS ||
            !Array.isArray(query.OPTIONS.COLUMNS) ||
            query.OPTIONS.COLUMNS.length === 0
        ) {
            this.rejectQuery(
                `Invalid Query: Query contained no COLUMNS to display`,
            );
        }

        const queryColumns = query.OPTIONS.COLUMNS;

        // Validate TRANSFORMATIONS section of query
        if (query.TRANSFORMATIONS !== undefined) {
            const queryGroup = query.TRANSFORMATIONS.GROUP;
            const queryApply = query.TRANSFORMATIONS.APPLY;

            if (
                !queryGroup ||
                !Array.isArray(queryGroup) ||
                queryGroup.length === 0
            ) {
                this.rejectQuery(
                    `Invalid Query: Empty or invalid GROUP operation - all TRANSFORMATIONS require min. 1 GROUP key`,
                );
            }

            // Validate APPLY Section of Query Object
            if (queryApply !== undefined) {
                if (!Array.isArray(queryApply) || queryApply.length === 0) {
                    this.rejectQuery(
                        `Invalid Query: Empty or invalid APPLY section`,
                    );
                }

                queryApply.forEach((apply) => {
                    const name = Object.keys(apply)[0];
                    const aggName = Object.keys(
                        apply[name],
                    )[0] as InsightAggregatorKind;

                    // Check Aggregation Name is valid
                    // No spaces, underscores or equal to RESERVED
                    if (
                        name.includes("_") ||
                        name.includes(" ") ||
                        reservedRE.test(name)
                    ) {
                        this.rejectQuery(
                            `Invalid Query: Invalid Aggregation Name: ${name}`,
                        );
                    }

                    // Check Aggregation Operation Name is valid
                    if (
                        !Object.values(InsightAggregatorKind).includes(aggName)
                    ) {
                        this.rejectQuery(
                            `Invalid Query: Unrecognised Aggregation Operation: ${aggName}`,
                        );
                    }

                    const aggInfo = queryAggNameToIAggregatorInfo[aggName];
                    const colName = apply[name][aggName];

                    // Check the name of the column to be aggregated is valid
                    if (
                        !this.validateEBNFColName(queryID, query.KIND, colName)
                    ) {
                        this.rejectQuery(
                            `Invalid Query: Invalid column name for APPLY: ${colName}`,
                        );
                    }

                    // Check that the colName is valid for the dataset kind
                    const [strColName, { key: colKey, type: colType }] =
                        this.getColDetailsFromKeyAndKind(
                            colName.split("_")[1],
                            query.KIND,
                        );

                    // Ensure the aggregation operation is valid for the given column:
                    if (aggInfo.aggType === "number" && colType !== "number") {
                        this.rejectQuery(
                            `Invalid Query: Aggregation type ${aggName} cannot be applied to ${strColName} column`,
                        );
                    }
                });
            }

            // We can only DISPLAY/COLUMNS that are GROUP or APPLY
            const applyColNames = queryApply
                ? queryApply.map((applyObj) => Object.keys(applyObj)[0])
                : [];

            queryColumns.forEach((colName) => {
                // If it is a valid column name it must be in GROUP
                const validColName = this.validateEBNFColName(
                    query.ID,
                    query.KIND,
                    colName,
                );
                if (validColName && !queryGroup.includes(colName)) {
                    this.rejectQuery(
                        `Invalid Query: When GROUP present COLUMNS must be in GROUP or APPLY, got: ${colName}`,
                    );
                } else if (!validColName && !applyColNames.includes(colName)) {
                    // Not a regular columns and we have not defined it as an aggregator name
                    this.rejectQuery(
                        `Invalid Query: Unrecognised column name ${colName} in COLUMNS`,
                    );
                }
            });
        } else {
            // No TRANSFORMATIONS, DISPLAY/COLUMNS must all be valid
            queryColumns.forEach((colName) => {
                if (!this.validateEBNFColName(query.ID, query.KIND, colName)) {
                    this.rejectQuery(
                        `Invalid Query: Invalid column name ${colName} in COLUMNS`,
                    );
                }
            });
        }

        // Validate ORDER Section - Can only ORDER by DISPLAY/COLUMNS
        if (query.OPTIONS.ORDER) {
            const queryOrder = query.OPTIONS.ORDER;

            if (typeof queryOrder === "string") {
                // Basic Ordering Format - single query order ASCENDING
                // ORDER column must also be in COLUMNS / DISPLAY
                if (!queryColumns.includes(queryOrder)) {
                    this.rejectQuery(
                        `Invalid Query: ORDER columns must be in COLUMNS, got ${queryOrder}`,
                    );
                }
            } else {
                const queryOrderObj = queryOrder as InsightEBNFQueryOrderObject;

                if (
                    !queryOrderObj.dir ||
                    !Object.values(InsightEBNFQueryOrderDir).includes(
                        queryOrderObj.dir,
                    )
                ) {
                    this.rejectQuery(
                        `Invalid Query: 'dir' property of ORDER Invalid: ${queryOrder}`,
                    );
                }

                const queryOrderKeys = queryOrderObj.keys;

                if (
                    !queryOrderKeys ||
                    !Array.isArray(queryOrderKeys) ||
                    !queryOrderKeys
                ) {
                    this.rejectQuery(
                        `Invalid Query: No keys specified in 'keys' property of ORDER: ${queryOrder}`,
                    );
                }

                // All ORDER keys must be in DISPLAY/COLUMNS
                queryOrderKeys.forEach((key) => {
                    if (!queryColumns.includes(key)) {
                        this.rejectQuery(
                            `Invalid Query: Cannot ORDER by column not in COLUMNS, got: ${key}`,
                        );
                    }
                });
            }
        }

        return true;
    }

    private validateWhere(
        datasetID: string,
        datasetKind: InsightDatasetKind,
        whereObj: any,
    ): boolean {
        const conditionKey = Object.keys(whereObj)[0];

        if (!conditionKey || Object.keys(whereObj).length > 1) {
            this.rejectQuery(
                `Invalid Query: Invalid WHERE section of query: ${JSON.stringify(
                    whereObj,
                )}`,
            );
        }

        // Logical combination conditional -> process all sub-conditionals
        if (conditionKey === "AND" || conditionKey === "OR") {
            const conditionArr = whereObj[conditionKey];
            if (
                !conditionArr ||
                !Array.isArray(conditionArr) ||
                conditionArr.length !== 2
            ) {
                this.rejectQuery(
                    `Invalid Query: Invalid WHERE logical condition: ${JSON.stringify(
                        whereObj,
                    )}`,
                );
            }

            conditionArr.forEach((subCondition: any) => {
                this.validateWhere(datasetID, datasetKind, subCondition);
            });

            return true;
        }

        // NOT logical conditional -> Validate its sub-condition
        if (conditionKey === "NOT") {
            const subCondition = whereObj[conditionKey];
            return this.validateWhere(datasetID, datasetKind, subCondition);
        }

        // Single conditional
        if (conditionKeyToIFilterInfo.hasOwnProperty(conditionKey)) {
            if (
                typeof whereObj[conditionKey] !== "object" ||
                Object.keys(whereObj[conditionKey]).length !== 1
            ) {
                this.rejectQuery(
                    `Invalid Query: Invalid WHERE single condition: ${JSON.stringify(
                        whereObj,
                    )}`,
                );
            }

            // Check colName is valid for dataset ID and Kind
            const colName = Object.keys(whereObj[conditionKey])[0];
            this.validateEBNFColName(datasetID, datasetKind, colName);

            // Check that condition value, conditionKey and column are all
            // the same type (number or string):
            const colKey = colName.split("_")[1];
            const [stringColName, { type: colType }] =
                this.getColDetailsFromKeyAndKind(colKey, datasetKind);

            const conditionVal = whereObj[conditionKey][colName];
            const valueType = typeof conditionVal;
            const { conditionType } = conditionKeyToIFilterInfo[conditionKey];

            if (valueType !== conditionType || colType !== conditionType) {
                this.rejectQuery(
                    `Invalid Query: Type mismatch in WHERE condition: ${JSON.stringify(
                        whereObj,
                    )}`,
                );
            }

            // If the type is string, check that the string is valid (no '*' or '"')
            if (
                valueType === "string" &&
                (conditionVal.includes("*") || conditionVal.includes('"'))
            ) {
                this.rejectQuery(
                    `Invalid Query: WHERE condition string cannot include '*' or '_', got: ${conditionVal}`,
                );
            }

            return true;
        } else {
            // Invalid condition key in WHERE
            this.rejectQuery(
                `Invalid Query: Invalid key in WHERE: ${conditionKey}`,
            );
        }
    }

    /**
     * Helper function to validate that a given column name in EBNF Query Object is valid
     * e.g. courses_avg is valid for a 'courses' kind dataset, where courses_furniture
     * would be invalid
     * @param datasetID the id of the dataset that is being queried
     * @param datasetKind the dataset kind of the dataset being queried (courses | rooms)
     * @param queryColName the column name in the EBNF Query Object
     */
    private validateEBNFColName(
        datasetID: string,
        datasetKind: InsightDatasetKind,
        queryColName: string,
    ): boolean {
        const nameSections = queryColName.split("_");

        if (nameSections.length !== 2) {
            return false;
        }

        const [colID, colKey] = nameSections;

        if (colID !== datasetID) {
            return false;
        }

        // Check that the colKey is valid for the dataset kind
        const matchingColumn = this.getColDetailsFromKeyAndKind(
            colKey,
            datasetKind,
        );

        // If we find no matching Column, the column key was not valid
        if (!matchingColumn) {
            return false;
        }

        // Otherwise the column name is valid for dataset id and kind
        return true;
    }

    /**
     * Helper method that given a requested column key e.g. 'avg'
     * and the dataset kind being queried, returns details about
     * the associated column, if it is a valid key for a column in
     * the given dataset kind.
     *
     * @param colKey string key of column to get details of
     * @param datasetKind the dataset KIND being queried
     */
    private getColDetailsFromKeyAndKind(
        colKey: string,
        datasetKind: InsightDatasetKind,
    ): [string, { key: string; type: "number" | "string" }] {
        const validColNames = Object.entries(
            strQueryColNamesToKeyAndType[datasetKind],
        );

        const colMatch = validColNames.filter(
            ([stringColName, { key, type }]) => {
                return key === colKey;
            },
        );

        return colMatch[0];
    }

    /**
     * Parses the WHERE section of EBNF Query Object
     * Assumes the Query Object has been validated
     * Returns an IFilter representing the given combination of Conditions
     *
     * @param whereObj the nested WHERE (FILTER) Object from the EBNF Query Object
     */
    private parseWHERE(whereObj: any): IFilter {
        // If no Filter conditions, return all rows
        if (Object.keys(whereObj).length === 0) {
            return new ALLFilter();
        }

        const conditionKey = Object.keys(whereObj)[0];

        if (conditionKey === "AND" || conditionKey === "OR") {
            const filter = conditionKey === "AND" ? ANDFilter : ORFilter;
            return new filter(
                this.parseWHERE(whereObj[conditionKey][0]),
                this.parseWHERE(whereObj[conditionKey][1]),
            );
        } else if (conditionKey === "NOT") {
            return new NOTFilter(this.parseWHERE(whereObj[conditionKey]));
        } else {
            // Single condition filter
            const { filter } = conditionKeyToIFilterInfo[conditionKey];
            const colName = Object.keys(whereObj[conditionKey])[0];
            const columnValue = whereObj[conditionKey][colName];

            return new filter(colName, columnValue);
        }
    }

    /**
     * Parses the ORDER section of EBNF Query Object
     * Assumes the Query Object has been validated
     * Returns a Query AST 'order' object for DatasetQuerier
     *
     * @param orderObj the ORDER section of the EBNF Query
     */
    private parseORDER(orderObj: string | InsightEBNFQueryOrderObject): {
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
     * Assumes the Query Object has been validated
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

            const aggInfo = queryAggNameToIAggregatorInfo[aggName];
            const colName = apply[name][aggName];

            const operation = new aggInfo.Aggregator(name, colName);

            applyObjArr.push({ name, operation, colName });
        });

        return applyObjArr;
    }

    private rejectQuery(message: string) {
        throw new Error(`queryParser.parseQuery ERROR: ${message}`);
    }
}
