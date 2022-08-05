import { IFilter } from "./IFilter";
import { InsightCourseDataObject } from "../IInsightFacade";

/**
 * A filter that returns the negated result of its child filter
 * - e.g. 'is not' filter is NOT(EQ)
 */
export class NOTFilter implements IFilter {
    private childFilter: IFilter;

    constructor(childFilter: IFilter) {
        this.childFilter = childFilter;
    }

    public matches(dataObj: InsightCourseDataObject): boolean {
        return !this.childFilter.matches(dataObj);
    }

    public toString(): string {
        return `NOT(${this.childFilter.toString()})`;
    }
}
