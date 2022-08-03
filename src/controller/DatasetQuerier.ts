import { InsightCourseDataObject, InsightQueryAST } from "./IInsightFacade";

// Class that takes a queryAST and a dataset, applies the query and returns
// the appropriately filtered and sorted dataset
export default class DatasetQuerier {
    public applyQuery(
        queryAST: InsightQueryAST,
        dataset: InsightCourseDataObject[],
    ): InsightCourseDataObject[] {
        // Apply the filter to the dataset, then extract the desired columns and sort
        const filteredData = dataset
            .filter(queryAST.filter.matches)
            .map((courseSection: InsightCourseDataObject) => {
                const selectedColData: InsightCourseDataObject = {};
                queryAST.display.forEach((colName: string) => {
                    selectedColData[colName] = courseSection[colName];
                });
                return selectedColData;
            });
        return filteredData;
    }
}
