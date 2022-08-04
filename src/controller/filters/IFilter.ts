import { InsightCourseDataObject } from "../IInsightFacade";

/**
 * Interface that captures behaviour of FILTERS in a query
 */
export interface IFilter {
    /**
     * @param dataObj The current course data object being tested against the filter
     *
     * @return Boolean indicating whether or not the given course data object passes the filter
     */
    matches(dataObj: InsightCourseDataObject): boolean;

    /**
     * @return string representation of the entire filter
     */
    toString(): string;
}
