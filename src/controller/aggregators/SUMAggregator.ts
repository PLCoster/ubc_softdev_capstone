import { Decimal } from "decimal.js";

import { InsightCourseDataObject } from "../IInsightFacade";
import { IAggregator } from "./IAggregator";

/**
 * A NUMBER Aggregator that calculates the sum of the given property of a dataGroup
 * - adds the result to the dataObject at index 0 of the dataGroup
 * - calculates SUM to two decimal places using Decimal package
 */
export class SUMAggregator implements IAggregator {
    private aggColName: string;
    private applyColName: string;

    constructor(aggColName: string, applyColName: string) {
        this.aggColName = aggColName;
        this.applyColName = applyColName;
    }

    public applyAggregation(
        dataGroup: InsightCourseDataObject[],
    ): InsightCourseDataObject[] {
        let sum = new Decimal(0);

        dataGroup.forEach((dataObj) => {
            sum = sum.plus(new Decimal(dataObj[this.applyColName]));
        });

        const roundedSum = Number(sum.toFixed(2));

        dataGroup[0][this.aggColName] = roundedSum;
        return dataGroup;
    }

    public toString(): string {
        return `SUM(${this.applyColName}) as ${this.aggColName}`;
    }
}
