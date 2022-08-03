/* eslint-disable @typescript-eslint/tslint/config */
/* eslint-disable no-console */
import { auditLogger } from "restify";
import { IFilter, ALLFilter } from "./filters";
import { InsightDatasetKind, InsightQueryAST } from "./IInsightFacade";

const columnNameRE =
    /Average|Pass|Fail|Audit|Department|ID|Instructor|Title|UUID/;

const keywordRE =
    /In|dataset|find|all|show|and|or|sort|by|entries|is|the|of|whose/;

const numberOPRE = /is (?:not )? (?:greater than|less than|equal to) /;

const stringOPRE =
    /(?:is (?:not )?|includes|does not include|(?:begins|does not begin|ends|does not end) with)/;

const datasetRE = /^In (?<KIND>courses|rooms) dataset (?<INPUT>\S+)$/;

const filterRE = /^(?<ALL>find all entries)*$/;

const orderRE = new RegExp(
    `^sort in (?<DIRECTION>ascending) order by (?<COLNAME>${columnNameRE.source})$`,
);

const displayRE = new RegExp(
    `(((${columnNameRE.source}), )+(${columnNameRE.source}) and (${columnNameRE.source}))|((${columnNameRE.source}) and (${columnNameRE.source}))|(${columnNameRE.source})`,
);

const queryRE = new RegExp(
    `^(?<DATASET>In (?:courses|rooms) dataset [a-zA-Z0-9]+), (?<FILTER>find all entries|find entries whose *); show (?<DISPLAY>${displayRE.source})(; (?<ORDER>sort in ascending order by (${columnNameRE.source})))?[.]$`,
);

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
    public parseQuery(queryStr: string) {
        // Split query string into major components
        const queryMatchObj = queryStr.match(queryRE);

        if (!queryMatchObj) {
            this.rejectQuery(`Invalid Query String Format`);
        }

        // console.log(queryMatchObj);

        const {
            groups: {
                DATASET: datasetStr,
                FILTER: filterStr,
                DISPLAY: displayStr,
                ORDER: orderStr,
            },
        } = queryMatchObj;

        // console.log("DATASET: ", datasetStr);
        // console.log("FILTER ", filterStr);
        // console.log("DISPLAY: ", displayStr);
        // console.log("Order: ", orderStr);

        // Parse DATASET, FILTER(S), DISPLAY and ORDER sections of query
        const { id, kind } = this.parseDataset(datasetStr);
        const filter = this.parseFilters(filterStr);
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

        // console.log("FINAL QUERY AST: ", queryAST);
        return queryAST;
    }

    // Extracts Dataset INPUT(id) and KIND from query string
    private parseDataset(datasetStr: string): {
        id: string;
        kind: InsightDatasetKind;
    } {
        const datasetMatchObj = datasetStr.match(datasetRE);

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
    private parseFilters(filterStr: string) {
        if (filterStr === "find all entries") {
            return new ALLFilter();
        }

        // !!! FINISH FILTER PARSING IN NON-SIMPLE CASE
        this.rejectQuery("COMPLEX FILTERS NOT YET SUPPORTED");
        return new ALLFilter();
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
        const orderMatchObj = orderStr.match(orderRE);

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

        return ["ASC", `${id}_${orderMatchObj.groups.COLNAME}`];
    }

    private rejectQuery(message: string) {
        throw new Error(`queryParser.parseQuery ERROR: ${message}`);
    }
}

// const testParser = new QueryParser();
// testParser.parseQuery(
//     "In courses dataset singleentry, find all entries; show Audit, Pass and Fail; sort in ascending order by Audit.",
// );

// console.log("DONE");
