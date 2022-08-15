import { Decimal } from "decimal.js";
import Log from "../../Util";

import { InsightCourseDataObject } from "../IInsightFacade";
import { IAggregator } from "./IAggregator";

/**
 * An NUMBER Aggregator that calculates the average of the given property of a dataGroup
 * - adds the result to the dataObject at index 0 of the dataGroup
 * - calculates AVG to two decimal places using Decimal package
 */
export class AVGAggregator implements IAggregator {
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

        const avg = sum.toNumber() / dataGroup.length;
        const roundedAvg = Number(avg.toFixed(2));

        dataGroup[0][this.aggColName] = roundedAvg;
        return dataGroup;
    }

    public toString(): string {
        return `AVG(${this.applyColName}) as ${this.aggColName}`;
    }
}
