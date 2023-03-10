import { IFilter } from "./IFilter";
import { InsightCourseDataObject } from "../IInsightFacade";

/**
 * A simple filter that returns true on every course data object
 * - equivalent to 'find all entries' query filter
 */
export class ALLFilter implements IFilter {
    public matches(dataObj: InsightCourseDataObject): boolean {
        return true;
    }

    public toString(): string {
        return "ALL";
    }
}
