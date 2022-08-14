import { InsightCourseDataObject } from "../IInsightFacade";

/**
 * Interface that captures behaviour of AGGREGATORS in a query
 */
export interface IAggregator {
    /**
     * @param dataGroup The current group of InsightDataObjects to apply the Aggregation to
     *
     * @return Updated array of InsightCourseDataObjects with the Aggregation added to object at index 0
     */
    apply(dataGroup: InsightCourseDataObject[]): InsightCourseDataObject[];

    /**
     * @return string representation of the Aggregator
     */
    toString(): string;
}
