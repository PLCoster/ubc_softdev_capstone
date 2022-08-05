import { IFilter } from "./IFilter";
import { InsightCourseDataObject } from "../IInsightFacade";

/**
 * A filter that represents the logical OR of its two child filters
 * - e.g. 'CONDITION1 OR CONDITION2'
 */
export class ORFilter implements IFilter {
    private leftChildFilter: IFilter;
    private rightChildFilter: IFilter;

    constructor(leftChildFilter: IFilter, rightChildFilter: IFilter) {
        this.leftChildFilter = leftChildFilter;
        this.rightChildFilter = rightChildFilter;
    }

    public matches(dataObj: InsightCourseDataObject): boolean {
        return (
            this.leftChildFilter.matches(dataObj) ||
            this.rightChildFilter.matches(dataObj)
        );
    }

    public toString(): string {
        return `(${this.leftChildFilter.toString()} OR ${this.rightChildFilter.toString()})`;
    }
}
