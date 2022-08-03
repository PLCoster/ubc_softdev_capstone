import { InsightCourseDataObject, InsightQueryAST } from "./IInsightFacade";

// Class that takes a queryAST and a dataset, applies the query and returns
// the appropriately filtered and sorted dataset
export default class DatasetQuerier {
    public applyQuery(
        queryAST: InsightQueryAST,
        dataset: InsightCourseDataObject[],
    ): InsightCourseDataObject[] {
        return [];
    }
}
