import { InsightDatasetKind, InsightQueryAST } from "./IInsightFacade";

import { IFilter, ALLFilter, NOTFilter, ANDFilter, ORFilter } from "./filters";
import Log from "../Util";

import {
    queryRE,
    inputKindRE,
    singleFilterRE,
    columnNameRE,
    sortDirectionColRE,
    filterDetailsRE,
} from "./helpers/queryParserRegExs";
import { conditionStringToIFilterInfo } from "./helpers/conditionStringToIFilterInfo";

const queryColumnStrToKeyStr: { [key: string]: string } = {
    Audit: "audit",
    Average: "avg",
    Department: "dept",
    Fail: "fail",
    ID: "id",
    Instructor: "instructor",
    Pass: "pass",
    Title: "title",
    UUID: "uuid",
};

export default class QueryParser {
    constructor() {
        Log.trace("QueryParser::init()");
    }

    public parseQuery(queryStr: string) {
        // Split query string into major components
        const queryMatchObj = queryStr.match(queryRE);

        if (!queryMatchObj) {
            this.rejectQuery(`Invalid Query String Format`);
        }

        const {
            groups: {
                DATASET: datasetStr,
                FILTER: filterStr,
                DISPLAY: displayStr,
                ORDER: orderStr,
            },
        } = queryMatchObj;

        // Parse DATASET, FILTER(S), DISPLAY and ORDER sections of query
        const { id, kind } = this.parseDataset(datasetStr);
        const filter = this.parseFilters(filterStr, id);
        const display = this.parseDisplay(displayStr, id);

        const queryAST: InsightQueryAST = {
            id,
            kind,
            filter,
            display,
            order: null,
        };

        if (orderStr) {
            queryAST.order = this.parseOrder(orderStr, id, display);
        }

        return queryAST;
    }

    // Extracts Dataset INPUT(id) and KIND from query string
    private parseDataset(datasetStr: string): {
        id: string;
        kind: InsightDatasetKind;
    } {
        const datasetMatchObj = datasetStr.match(inputKindRE);

        if (!datasetMatchObj) {
            this.rejectQuery(
                "Invalid Query Format - DATASET KIND or INPUT not recognised",
            );
        }

        const id: string = datasetMatchObj.groups.INPUT;
        const kind = datasetMatchObj.groups.KIND as InsightDatasetKind;

        // !!! D1 - do not accept rooms Dataset Kind:
        if (kind === InsightDatasetKind.Rooms) {
            this.rejectQuery(
                "Invalid Query Format - DATASET KIND cannot be rooms for D1",
            );
        }

        // Ensure that dataset id does not contain underscore char
        if (id.includes("_")) {
            this.rejectQuery(
                "Invalid Query Format - DATASET INPUT cannot contain underscore",
            );
        }

        return { id, kind };
    }

    // Extracts FILTER(s) from query string, builds AST for filters:
    private parseFilters(filterStr: string, id: string): IFilter {
        if (filterStr === "find all entries") {
            return new ALLFilter();
        }

        // Otherwise at least one query filter is specified
        // Trim off 'find entries whose ' from start of filterStr
        filterStr = filterStr.slice(19);

        // Determine number of filters present:
        const filterOperatorArr = filterStr
            .split(new RegExp(`(${singleFilterRE.source}|and|or)`))
            .filter((str) => str.length > 1);

        if (!filterOperatorArr.length) {
            this.rejectQuery(
                `Invalid Query Format - could not parse FILTER section correctly`,
            );
        }

        // Build and Return Filter
        return this.buildFilters(
            filterOperatorArr,
            id,
            filterOperatorArr.length - 1,
        );
    }

    // Extracts DISPLAY from query string:
    private parseDisplay(displayStr: string, id: string): string[] {
        const displayColNames = displayStr.split(/, | /);
        const numCols = displayColNames.length;

        const displayCols = new Set<string>();

        displayColNames.forEach((colName, index) => {
            // Check multiple column display syntax is correct:
            if (numCols > 1 && index === numCols - 2) {
                if (colName !== "and") {
                    this.rejectQuery(
                        "Invalid Query Format - bad DISPLAY section syntax",
                    );
                }
                return;
            }

            // Check Column Name is valid, if not throw error:
            if (!columnNameRE.test(colName)) {
                this.rejectQuery(
                    `Invalid Query Format - invalid DISPLAY section COLUMN NAME ${colName}`,
                );
            }
            displayCols.add(`${id}_${queryColumnStrToKeyStr[colName]}`);
        });

        // If we have no column names, to display then throw an error:
        if (!displayCols.size) {
            this.rejectQuery(
                `Invalid Query Format - invalid DISPLAY section, no column names specified`,
            );
        }

        return Array.from(displayCols);
    }

    // Extracts ORDER from query string
    private parseOrder(
        orderStr: string,
        id: string,
        displayCols: string[],
    ): [string, string] {
        const orderMatchObj = orderStr.match(sortDirectionColRE);

        const orderKey = `${id}_${
            queryColumnStrToKeyStr[orderMatchObj.groups.COLNAME]
        }`;

        const ordering =
            orderMatchObj.groups.DIRECTION === "ascending" ? "ASC" : "DESC";

        // !!! D1 Only ASC order is valid:
        if (ordering === "DESC") {
            this.rejectQuery(
                `Invalid Query Format: D1 queries can only accept ascending ordering`,
            );
        }

        // Check query semantics - we can only sort by a column that is being displayed:
        if (!displayCols.includes(orderKey)) {
            this.rejectQuery(
                `Invalid Query Format: Invalid ORDER semantics - column ${ordering} not selected in DISPLAY`,
            );
        }

        return [
            ordering,
            `${id}_${queryColumnStrToKeyStr[orderMatchObj.groups.COLNAME]}`,
        ];
    }

    // // Builds up the nested filter object based on query filter criteria:
    private buildFilters(
        filterOperatorArr: string[],
        id: string,
        currentIndex: number,
    ): IFilter {
        // If we only have a single filter, just build and return that single filter
        if (currentIndex === 0) {
            return this.buildSingleFilter(filterOperatorArr[0], id);
        }

        // Otherwise build left and right filters and combine with logical filter
        const rightFilter = this.buildSingleFilter(
            filterOperatorArr[currentIndex],
            id,
        );

        const logicalFilter =
            filterOperatorArr[currentIndex - 1] === "and"
                ? ANDFilter
                : ORFilter;

        const leftFilter = this.buildFilters(
            filterOperatorArr,
            id,
            currentIndex - 2,
        );

        return new logicalFilter(leftFilter, rightFilter);
    }

    // Builds and returns a single IFilter based on the filter criteria:
    private buildSingleFilter(filterStr: string, id: string): IFilter {
        // Parse relevant information from the filterstring:
        const filterMatchObj = filterStr.match(filterDetailsRE);

        if (!filterMatchObj) {
            this.rejectQuery(`Invalid filter syntax: ${filterStr}`);
        }

        const {
            groups: { COLNAME: colname, CONDITION: condition, VALUE: value },
        } = filterMatchObj;

        const { filter, valueParser, negation } =
            conditionStringToIFilterInfo[condition];

        const conditionKey = `${id}_${queryColumnStrToKeyStr[colname]}`;
        const conditionValue = valueParser(value);

        let builtFilter: IFilter = new filter(conditionKey, conditionValue);

        // If this filter is a negation, then wrap filter inside a NOT filter:
        if (negation) {
            builtFilter = new NOTFilter(builtFilter);
        }

        return builtFilter;
    }

    private rejectQuery(message: string) {
        throw new Error(`queryParser.parseQuery ERROR: ${message}`);
    }
}
