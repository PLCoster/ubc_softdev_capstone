import { IFilter } from "./IFilter";
import { InsightCourseDataObject } from "../IInsightFacade";

/**
 * A NUMBER or STRING filter that returns true for all InsightCourseDataObjects
 * with column value equal to specified value
 * - equivalent to 'COLNAME (is|is equal to) VALUE' query filter
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
        return `${this.columnKey} === ${this.columnValue}`;
    }
}
