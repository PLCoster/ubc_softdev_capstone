import { IFilter, ALLFilter } from "./filters";

const columnNameRE =
    /Average|Pass|Fail|Audit|Department|ID|Instructor|Title|UUID/;

const keywordRE =
    /In|dataset|find|all|show|and|or|sort|by|entries|is|the|of|whose/;

const numberOPRE = /is (?:not )? (?:greater than|less than|equal to) /;

const stringOPRE =
    /(?:is (?:not )?|includes|does not include|(?:begins|does not begin|ends|does not end) with)/;

const datasetRE = /^In (?<KIND>courses|rooms) dataset (?<INPUT>\S+)$/;

const filterRE = /^(?<ALL>find all entries)*$/;

export default class QueryParser {
    public parseQuery(queryStr: string) {
        // Split query string into major components
        const querySections = queryStr.split(";");

        let datasetFiltersStr: string;
        let displayStr: string;
        let orderStr: string;

        if (querySections.length === 2) {
            [datasetFiltersStr, displayStr] = querySections;
        } else if (querySections.length === 3) {
            [datasetFiltersStr, displayStr, orderStr] = querySections;
        } else {
            this.rejectQuery(`Invalid Query Format`);
        }

        // Further separate DATASET from FILTER(S) components
        const datasetFiltersStrArr = datasetFiltersStr.split(",");

        if (datasetFiltersStrArr.length !== 2) {
            this.rejectQuery(`Invalid Query Format`);
        }

        const [datasetStr, filtersStr] = datasetFiltersStrArr;

        // console.log("SECTIONS: ", datasetFiltersStr, displayStr, orderStr);
        // console.log("DATASETFILTERS: ", datasetStr, filtersStr);
        // console.log("Display: ", displayStr);
        // console.log("Order: ", orderStr);

        // Parse DATASET, FILTER(S), DISPLAY and ORDER sections of query
        const { id, kind } = this.parseDataset(datasetStr);
        const { filters } = this.parseFilters(filtersStr);
        const { display } = this.parseDisplay(displayStr, id);

        const queryAST = { id, kind, filters, display };

        // console.log("FINAL QUERY AST: ", queryAST);
        return queryAST;
    }

    // Extracts Dataset INPUT(id) and KIND from query string
    private parseDataset(datasetStr: string) {
        const datasetMatchObj = datasetStr.match(datasetRE);

        if (!datasetMatchObj) {
            this.rejectQuery(
                "Invalid Query Format - DATASET KIND or INPUT not recognised",
            );
        }

        const {
            groups: { INPUT: id, KIND: kind },
        } = datasetMatchObj;

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
        if (filterStr === " find all entries") {
            return { filters: new ALLFilter() };
        }

        // !!! FINISH FILTER PARSING IN NON-SIMPLE CASE
        return { filters: new ALLFilter() };
    }

    // Extracts DISPLAY from query string:
    private parseDisplay(displayStr: string, id: string) {
        if (!displayStr.startsWith(" show ")) {
            this.rejectQuery("Invalid Query Format - bad DISPLAY section");
        }

        const displayColNames = displayStr.slice(6, -1).split(/, | /);
        const numCols = displayColNames.length;

        // console.log(displayColNames);
        const displayCols = new Set();

        displayColNames.forEach((colName, index) => {
            // Check multiple column display syntax is correct:
            // !!! try doing this with REGEX instead?
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
            displayCols.add(`${id}_${colName}`);
        });

        // If we have no column names, to display then throw an error:
        if (!displayCols.size) {
            this.rejectQuery(
                `Invalid Query Format - invalid DISPLAY section, no column names specified`,
            );
        }

        return { display: Array.from(displayCols) };
    }

    private rejectQuery(message: string) {
        throw new Error(`queryParser.parseQuery ERROR: ${message}`);
    }
}

// const testParser = new QueryParser();
// testParser.parseQuery(
//     "In courses dataset singleentry, find all entries; show Audit.",
// );

// console.log("DONE");
