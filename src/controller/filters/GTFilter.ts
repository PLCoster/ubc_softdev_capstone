import { IFilter } from "./IFilter";
import { InsightCourseDataObject } from "../IInsightFacade";

/**
 * A NUMBER filter that returns true for all InsightCourseDataObjects
 * with column value greater than specified value
 * - equivalent to 'COLNAME greater than VALUE' query filter
 */
export class GTFilter implements IFilter {
    private columnKey: string;
    private columnValue: number;

    constructor(columnKey: string, columnValue: number) {
        this.columnKey = columnKey;
        this.columnValue = columnValue;
    }

    public matches(dataObj: InsightCourseDataObject): boolean {
        return dataObj[this.columnKey] > this.columnValue;
    }

    public toString(): string {
        return `${this.columnKey} > ${this.columnValue}`;
    }
}
