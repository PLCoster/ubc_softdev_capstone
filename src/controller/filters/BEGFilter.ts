import { IFilter } from "./IFilter";
import { InsightCourseDataObject } from "../IInsightFacade";

/**
 * A STRING filter that returns true for all InsightCourseDataObjects
 * with column values that begin with the specified (string) value
 * - equivalent to 'COLNAME begins with VALUE' query filter
 */
export class BEGFilter implements IFilter {
    private columnKey: string;
    private columnValue: string;

    constructor(columnKey: string, columnValue: string) {
        this.columnKey = columnKey;
        this.columnValue = columnValue;
    }

    public matches(dataObj: InsightCourseDataObject): boolean {
        const sectionColString = dataObj[this.columnKey] as string;
        return sectionColString.startsWith(this.columnValue);
    }

    public toString(): string {
        return `${this.columnKey} STARTS WITH ${this.columnValue}`;
    }
}
