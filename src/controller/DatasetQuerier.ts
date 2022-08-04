import { InsightCourseDataObject, InsightQueryAST } from "./IInsightFacade";
import Log from "../Util";

enum OrderDirection {
    asc = "ASC",
    desc = "DESC",
}

type InsightDatasetSortFunction = (
    a: InsightCourseDataObject,
    b: InsightCourseDataObject,
) => number;

type sortFunctionCreator = (sortKey: string) => InsightDatasetSortFunction;

// Closure Sort Functions for Ascending and Descending Order
const sortFuncs: { [key in OrderDirection]: sortFunctionCreator } = {
    ASC: (sortKey: string) => {
        return (a, b) => (a[sortKey] > b[sortKey] ? 1 : -1);
    },
    DESC: (sortKey: string) => {
        return (a, b) => (a[sortKey] > b[sortKey] ? -1 : 1);
    },
};

// Class that takes a queryAST and a dataset, applies the query and returns
// the appropriately filtered and sorted dataset
export default class DatasetQuerier {
    public applyQuery(
        queryAST: InsightQueryAST,
        dataset: InsightCourseDataObject[],
    ): InsightCourseDataObject[] {
        // Apply the filter to the dataset, then extract the desired columns and sort
        const filteredData: InsightCourseDataObject[] = dataset
            .filter(queryAST.filter.matches)
            .map((courseSection) => {
                const selectedColData: InsightCourseDataObject = {};
                queryAST.display.forEach((colName: string) => {
                    selectedColData[colName] = courseSection[colName];
                });
                return selectedColData;
            });

        Log.trace(`AST RECEIVED FOR QUERIER: ${JSON.stringify(queryAST)}`);

        // If the query contains an ORDER section, sort appropriately:
        // !!! D1 always sort in ascending order
        if (queryAST.order) {
            const direction = queryAST.order[0] as OrderDirection;
            const key: string = queryAST.order[1];
            filteredData.sort(sortFuncs[direction](key));
        }
        return filteredData;
    }
}
