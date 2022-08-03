const columnNameRE =
    /Average|Pass|Fail|Audit|Department|ID|Instructor|Title|UUID/;

const keywordRE =
    /In|dataset|find|all|show|and|or|sort|by|entries|is|the|of|whose/;

const numberOPRE = /is (?:not )? (?:greater than|less than|equal to) /;

const stringOPRE =
    /(?:is (?:not )?|includes|does not include|(?:begins|does not begin|ends|does not end) with)/;

const datasetRE = /^In (?<KIND>courses|rooms) dataset (?<INPUT>\S+)$/;

class QueryParser {
    public parseQuery(queryStr: string) {
        // Split query string into major components
        const querySections = queryStr.split(";");

        let datasetFiltersStr, displayStr, orderStr;

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

        console.log("SECTIONS: ", datasetFiltersStr, displayStr, orderStr);
        console.log("DATASETFILTERS: ", datasetStr, filtersStr);
        console.log("Display: ", displayStr);
        console.log("Order: ", orderStr);

        // Parse DATASET, FILTER(S), DISPLAY and ORDER sections of query
        const { id, kind } = this.parseDataset(datasetStr);
        const WHERE = this.parseFilters(filtersStr);

        const queryAST = { id, kind };

        console.log("FINAL QUERY AST: ", queryAST);
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

    // Extracts FILTER(s) from query string:
    private parseFilters(filterStr: string) {
        console.log("FILTERSTRING: ", filterStr);
    }

    private rejectQuery(message: string) {
        throw new Error(`queryParser.parseQuery ERROR: ${message}`);
    }
}

const testParser = new QueryParser();
testParser.parseQuery(
    "In courses dataset singleentry, find all entries; show Audit, Average, Department, Fail, ID, Instructor, Pass, Title and UUID.",
);

console.log("DONE");
