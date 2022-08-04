import { IFilter } from "./IFilter";
import { InsightCourseDataObject } from "../IInsightFacade";

/**
 * A filter that returns true for all InsightCourseDataObjects with column value less than specified value
 * - equivalent to 'COLNAME less than VALUE' query filter
 */
export class LTFilter implements IFilter {
    private columnKey: string;
    private columnValue: string | number;

    constructor(columnKey: string, columnValue: number | string) {
        this.columnKey = columnKey;
        this.columnValue = columnValue;
    }

    public matches(dataObj: InsightCourseDataObject): boolean {
        return dataObj[this.columnKey] < this.columnValue;
    }

    public toString(): string {
        return `${this.columnKey} < ${this.columnValue}`;
    }
}
