import { IFilter } from "./IFilter";
import { InsightCourseDataObject } from "../IInsightFacade";

/**
 * A STRING filter that returns true for all InsightCourseDataObjects
 * with column values that include the specified (string) value
 * - equivalent to 'COLNAME includes VALUE' query filter
 */
export class INCFilter implements IFilter {
    private columnKey: string;
    private columnValue: string;

    constructor(columnKey: string, columnValue: string) {
        this.columnKey = columnKey;
        this.columnValue = columnValue;
    }

    public matches(dataObj: InsightCourseDataObject): boolean {
        const sectionColString = dataObj[this.columnKey] as string;
        return sectionColString.includes(this.columnValue);
    }

    public toString(): string {
        return `${this.columnKey} === ${this.columnValue}`;
    }
}
