import { InsightCourseDataObject } from "../IInsightFacade";
import { IAggregator } from "./IAggregator";

/**
 * A NUMBER or STRING Aggregator that returns the COUNT of unique occurances of the given field
 * - adds the result to the dataObject at index 0 of the dataGroup
 */
export class COUNTAggregator implements IAggregator {
    private aggColName: string;
    private applyColName: string;

    constructor(aggColName: string, applyColName: string) {
        this.aggColName = aggColName;
        this.applyColName = applyColName;
    }

    public applyAggregation(
        dataGroup: InsightCourseDataObject[],
    ): InsightCourseDataObject[] {
        const valuesSeen = new Set<string | number>();
        let count = 0;

        dataGroup.forEach((dataObj) => {
            if (!valuesSeen.has(dataObj[this.applyColName])) {
                valuesSeen.add(dataObj[this.applyColName]);
                count += 1;
            }
        });

        dataGroup[0][this.aggColName] = count;
        return dataGroup;
    }

    public toString(): string {
        return `COUNT(${this.applyColName}) as ${this.aggColName}`;
    }
}
