import { InsightCourseDataObject } from "../IInsightFacade";
import { IAggregator } from "./IAggregator";

/**
 * A NUMBER Aggregator that returns the minimum of the given property of a dataGroup
 * - adds the result to the dataObject at index 0 of the dataGroup
 */
export class MINAggregator implements IAggregator {
    private aggColName: string;
    private applyColName: string;

    constructor(aggColName: string, applyColName: string) {
        this.aggColName = aggColName;
        this.applyColName = applyColName;
    }

    public applyAggregation(
        dataGroup: InsightCourseDataObject[],
    ): InsightCourseDataObject[] {
        let min = Infinity;

        dataGroup.forEach((dataObj) => {
            min = Math.min(min, dataObj[this.applyColName] as number);
        });

        dataGroup[0][this.aggColName] = min;
        return dataGroup;
    }

    public toString(): string {
        return `MIN(${this.applyColName}) as ${this.aggColName}`;
    }
}
