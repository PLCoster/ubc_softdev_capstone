import { Decimal } from "decimal.js";
import Log from "../../Util";

import { InsightCourseDataObject } from "../IInsightFacade";
import { IAggregator } from "./IAggregator";

/**
 * A NUMBER Aggregator that returns the maximum of the given property of a dataGroup
 * - adds the result to the dataObject at index 0 of the dataGroup
 */
export class MaxAggregator implements IAggregator {
    private aggColName: string;
    private applyColName: string;

    constructor(aggColName: string, applyColName: string) {
        this.aggColName = aggColName;
        this.applyColName = applyColName;
    }

    public applyAggregation(
        dataGroup: InsightCourseDataObject[],
    ): InsightCourseDataObject[] {
        let max = -Infinity;

        dataGroup.forEach((dataObj) => {
            max = Math.max(max, dataObj[this.applyColName] as number);
        });

        dataGroup[0][this.aggColName] = max;
        return dataGroup;
    }

    public toString(): string {
        return `MAX(${this.applyColName}) as ${this.aggColName}`;
    }
}
