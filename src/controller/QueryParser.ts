/* eslint-disable no-console */
import {
    InsightDatasetKind,
    InsightQueryAST,
    InsightQueryASTApplyObject,
} from "./IInsightFacade";
import { OrderDirection } from "./DatasetQuerier";
import { QuerySectionREs } from "./helpers/queryParserRegExs";

import { IFilter, ALLFilter, NOTFilter, ANDFilter, ORFilter } from "./filters";
import { IAggregator, AVGAggregator, MAXAggregator } from "./aggregators";
import Log from "../Util";

import {
    cQueryRE,
    rQueryRE,
    reservedRE,
    courseQuerySectionREs,
    roomsQuerySectionREs,
} from "./helpers/queryParserRegExs";
import { conditionStringToIFilterInfo } from "./helpers/conditionStringToIFilterInfo";

enum InsightFacadeAggregatorKind {
    AVG = "AVG",
    MAX = "MAX",
}

const queryAggNameToIAggregatorInfo: {
    [key in InsightFacadeAggregatorKind]: {
        Aggregator: new (
            aggColName: string,
            applyColName: string,
        ) => IAggregator;
        aggType: "numeric" | "all";
    };
} = {
    AVG: { Aggregator: AVGAggregator, aggType: "numeric" },
    MAX: { Aggregator: MAXAggregator, aggType: "numeric" },
};

const queryColNameStrToKeyStr: { [key: string]: string } = {
    "Audit": "audit",
    "Average": "avg",
    "Department": "dept",
    "Fail": "fail",
    "ID": "id",
    "Instructor": "instructor",
    "Pass": "pass",
    "Title": "title",
    "UUID": "uuid",
    "Year": "year",
    "Full Name": "fullname",
    "Short Name": "shortname",
    "Number": "number",
    "Name": "name",
    "Address": "address",
    "Type": "type",
    "Furniture": "furniture",
    "Link": "href",
    "Latitude": "lat",
    "Longitude": "lon",
    "Seats": "seats",
};

export default class QueryParser {
    constructor() {
        Log.trace("QueryParser::init()");
    }

    public parseQuery(queryStr: string) {
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
        groupBy: boolean = false,
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
                if (groupBy) {
                    this.rejectQuery(
                        `Invalid column name in GROUPBY: ${colName}`,
                    );
                }

                // DISPLAY Section can contain allowed APPLY aggregator names
                if (colName.includes("_") || reservedRE.test(colName)) {
                    // Invalid APPLY column name
                    this.rejectQuery(
                        `APPLY column names must not contain "_" or RESERVED, found ${colName}`,
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

        // Extract valid DataObj keys from query ORDER column names
        const orderKeys = orderMatchObj.groups.COLNAMES.split(/, | and /).map(
            (colName) => `${id}_${queryColNameStrToKeyStr[colName]}`,
        );

        // Check query semantics - we can only sort by a key that is being displayed:
        orderKeys.forEach((orderKey) => {
            if (!displayKeys.includes(orderKey)) {
                this.rejectQuery(
                    `Invalid ORDER semantics - column ${orderKey} not selected in DISPLAY`,
                );
            }
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
        // !!!NOTE: perhaps should check if aggName is in DISPLAY or not? (UI does not check for this, no error)
        // !!!Also could double check that Operation it Appropriate for ColName e.g. AVG cannot apply to 'Title'
        // !!!Check that each colName is only used once (e.g. can only have one Average aggregator)
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

            // !!! Check here for AGG semantics using aggType
            const { Aggregator, aggType } =
                queryAggNameToIAggregatorInfo[
                    aggOp as InsightFacadeAggregatorKind
                ];

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
        } else {
            // If no GROUPBY section, then by definition no APPLY section
            // Column Names can only be default Columns
            // !!! implement this properly
            // queryAST.display.forEach((colName: string) => {
            //     if (!querySectionREs.colNameRE.test(colName)) {
            //         this.rejectQuery(
            //             `Invalid column name in DISPLAY section: ${colName}`,
            //         );
            //     }
            // });
        }

        return true;
    }

    private rejectQuery(message: string) {
        throw new Error(`queryParser.parseQuery ERROR: ${message}`);
    }
}

// TEST DRIVER
// const queryParser = new QueryParser();

// tslint:disable-next-line:no-console
// console.log(
//     queryParser.parseQuery(
// tslint:disable-next-line:max-line-length
//         "In courses dataset coursesFourEntries grouped by Department, find all entries; show Department and maxPass, where maxPass is the MAX of Pass.",
//     ),
// );

// Log.trace("DONE");
