import { InsightDatasetKind, InsightQueryAST } from "./IInsightFacade";
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
            display,
            order: null,
        };

        if (groupStr) {
            queryAST.groupby = this.parseDisplayOrGroupBy(
                groupStr,
                id,
                querySectionREs,
            );
        }

        if (orderStr) {
            queryAST.order = this.parseOrder(
                orderStr,
                id,
                display,
                querySectionREs,
            );
        }

        this.astHasValidSemantics(queryAST);
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
        displayStr: string,
        id: string,
        querySectionREs: QuerySectionREs,
    ): string[] {
        const displayColNames = displayStr.split(/, | and /);
        const numCols = displayColNames.length;

        const displayCols = new Set<string>();

        displayColNames.forEach((colName, index) => {
            // Check Column Name is valid, if not throw error:
            if (!querySectionREs.colNameRE.test(colName)) {
                this.rejectQuery(
                    `Invalid Query: invalid DISPLAY COLUMN NAME ${colName}`,
                );
            }
            displayCols.add(`${id}_${queryColNameStrToKeyStr[colName]}`);
        });

        // If we have no column names, to display then throw an error:
        if (!displayCols.size) {
            this.rejectQuery(
                `Invalid Query: invalid DISPLAY, no column names specified`,
            );
        }

        return Array.from(displayCols);
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

    // // Builds up the nested filter object based on query filter criteria:
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
    private astHasValidSemantics(queryAST: InsightQueryAST): boolean {
        // If query has GROUPBY section, can only display grouped/agg cols:
        // !!! TODO: Check AGG cols here too
        if (queryAST.groupby) {
            queryAST.display.forEach((colName: string) => {
                if (!queryAST.groupby.includes(colName)) {
                    return this.rejectQuery(
                        `Invalid DISPLAY semantics when GROUPING - ${colName} not in GROUPBY or AGG`,
                    );
                }
            });
        }

        return true;
    }

    private rejectQuery(message: string) {
        throw new Error(`queryParser.parseQuery ERROR: ${message}`);
    }
}

// TEST DRIVER
// const queryParser = new QueryParser();
// console.log(
//     queryParser.parseQuery(
//         "In courses dataset coursesFourEntries grouped by Department, find all entries; show Department.",
//     ),
// );
// Log.trace("DONE");
