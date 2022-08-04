import { IFilter } from "./IFilter";
import { InsightCourseDataObject } from "../IInsightFacade";

/**
 * A filter that returns true for all InsightCourseDataObjects with column value equal to specified value
 * - equivalent to 'show all entries' query filter
 */
export class EQFilter implements IFilter {
    private columnKey: string;
    private columnValue: string | number;

    constructor(columnKey: string, columnValue: number | string) {
        this.columnKey = columnKey;
        this.columnValue = columnValue;
    }

    public matches(dataObj: InsightCourseDataObject): boolean {
        return dataObj[this.columnKey] === this.columnValue;
    }

    public toString(): string {
        return `${this.columnKey} EQ ${this.columnValue}`;
    }
}
