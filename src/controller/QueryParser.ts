import Log from "../Util";
import { IFilter, ALLFilter, EQFilter, GTFilter, NOTFilter } from "./filters";
import { InsightDatasetKind, InsightQueryAST } from "./IInsightFacade";

const columnNameRE =
    /Average|Pass|Fail|Audit|Department|ID|Instructor|Title|UUID/;

const numberColRE = /(?:Average|Pass|Fail|Audit)/;

const numberOPRE = /(?:is (?:not )?(?:greater than|less than|equal to))/;

const numberRE = /(?:(?:-)?(?:[1-9][0-9]*|0)(?:[.][0-9]+)?)/;

const numberFilterRE = RegExp(
    `(?:${numberColRE.source} ${numberOPRE.source} ${numberRE.source})`,
);

const stringColRE = /(?:Department|ID|Instructor|Title|UUID)/;

const stringOPRE =
    /(?:is(?: not)?|includes|does not include|(?:begins|does not begin|ends|does not end) with)/;

const stringRE = /"(?:[^*"]*)"/;

const stringFilterRE = RegExp(
    `(?:${stringColRE.source} ${stringOPRE.source} ${stringRE.source})`,
);

const singleFilterRE = RegExp(
    `(?:${numberFilterRE.source}|${stringFilterRE.source})`,
);

const keywordRE =
    /In|dataset|find|all|show|and|or|sort|by|entries|is|the|of|whose/;

const inputKindRE = /^In (?<KIND>courses|rooms) dataset (?<INPUT>\S+)$/;

const filterDetailsRE = new RegExp(
    // tslint:disable-next-line:max-line-length
    `^(?<COLNAME>${columnNameRE.source}) (?<CONDITION>${numberOPRE.source}|${stringOPRE.source}) (?<VALUE>${numberRE.source}|${stringRE.source})$`,
);

const sortDirectionColRE = new RegExp(
    `^sort in (?<DIRECTION>ascending) order by (?<COLNAME>${columnNameRE.source})$`,
);

const datasetRE = /(?<DATASET>In (?:courses|rooms) dataset [a-zA-Z0-9]+)/;

const filterRE = new RegExp(
    `(?<FILTER>find entries whose (?:${singleFilterRE.source} (?:and|or) )*${singleFilterRE.source}|find all entries)`,
);

const displaySingleRE = new RegExp(`(?:${columnNameRE.source})`);
const displayTwoRE = new RegExp(
    `(?:(:?${columnNameRE.source}) and (?:${columnNameRE.source}))`,
);
const displayMultRE = new RegExp(
    `(?:(?:(?:${columnNameRE.source}), )+(?:${columnNameRE.source}) and (?:${columnNameRE.source}))`,
);

const displayRE = new RegExp(
    `(?<DISPLAY>${displayMultRE.source}|${displayTwoRE.source}|${displaySingleRE.source})`,
);

const orderRE = new RegExp(
    `(?<ORDER>sort in (?:ascending|descending) order by (?:${columnNameRE.source}))`,
);

const queryRE = new RegExp(
    `^${datasetRE.source}, ${filterRE.source}; show ${displayRE.source}(?:; ${orderRE.source})?[.]$`,
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

interface IFilterInfo {
    filter: new (...args: any) => IFilter;
    valueParser: (val: string) => number | string;
    negation: boolean;
}

// Helper function that removes quotes around query string value
const stringValueParser = (val: string) => val.slice(1, -1);

const filterConditionToIFilterInfo: { [key: string]: IFilterInfo } = {
    "is equal to": {
        filter: EQFilter,
        valueParser: parseFloat,
        negation: false,
    },
    "is not equal to": {
        filter: EQFilter,
        valueParser: parseFloat,
        negation: true,
    },
    "is greater than": {
        filter: GTFilter,
        valueParser: parseFloat,
        negation: false,
    },
    "is not greater than": {
        filter: GTFilter,
        valueParser: parseFloat,
        negation: true,
    },
    "is": {
        filter: EQFilter,
        valueParser: stringValueParser,
        negation: false,
    },
    "is not": {
        filter: EQFilter,
        valueParser: stringValueParser,
        negation: true,
    },
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

        // console.log("FINAL QUERY AST: ", queryAST);
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
        // console.log("SLICED FILTER: ", filterStr);

        // Determine number of filters present:
        const filterOperatorArr = filterStr
            .split(new RegExp(`(${singleFilterRE.source}|and|or)`))
            .filter((str) => str.length > 1);
        // console.log(filterOperatorArr);

        // Build and Return Filter
        return this.buildFilters(filterOperatorArr, id);
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
    private buildFilters(filterOperatorArr: string[], id: string): IFilter {
        // If we only have a single filter, just build and return that single filter
        if (filterOperatorArr.length === 1) {
            return this.buildSingleFilter(filterOperatorArr[0], id);
        }

        // NEED TO IMPLEMENT MORE COMPLEX FILTER COMBINATIONS:
        this.rejectQuery("MORE COMPLEX QUERIES NOT YET IMPLEMENTED");

        return new ALLFilter();
    }

    // Builds and returns a single IFilter based on the filter criteria:
    private buildSingleFilter(filterStr: string, id: string): IFilter {
        // Parse relevant information from the filterstring:
        const filterMatchObj = filterStr.match(filterDetailsRE);

        if (!filterMatchObj) {
            this.rejectQuery(`Invalid filter syntax: ${filterStr}`);
        }

        // console.log(filterDetailsRE);
        // console.log(filterMatchObj);

        const {
            groups: { COLNAME: colname, CONDITION: condition, VALUE: value },
        } = filterMatchObj;

        if (condition in filterConditionToIFilterInfo) {
            const { filter, valueParser, negation } =
                filterConditionToIFilterInfo[condition];

            const conditionKey = `${id}_${queryColumnStrToKeyStr[colname]}`;
            const conditionValue = valueParser(value);

            let builtFilter: IFilter = new filter(conditionKey, conditionValue);

            // If this filter is a negation, then wrap filter inside a NOT filter:
            if (negation) {
                builtFilter = new NOTFilter(builtFilter);
            }

            return builtFilter;
        }

        this.rejectQuery(`NOT YET IMPLEMENTED!`);
        return new ALLFilter();
    }

    private rejectQuery(message: string) {
        throw new Error(`queryParser.parseQuery ERROR: ${message}`);
    }
}

// const testParser = new QueryParser();
// testParser.parseQuery(
// tslint:disable-next-line:max-line-length
//     'In courses dataset singleentry, find entries whose Instructor is "edward"; show Audit, Pass and Fail; sort in ascending order by Audit.',
// );

// console.log("DONE");
