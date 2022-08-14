import { InsightCourseDataObject, InsightQueryAST } from "./IInsightFacade";

import Log from "../Util";

export enum OrderDirection {
    asc = "ASC",
    desc = "DESC",
}

type InsightDatasetSortFunction = (
    a: InsightCourseDataObject,
    b: InsightCourseDataObject,
) => number;

type sortFunctionCreator = (sortKeys: string[]) => InsightDatasetSortFunction;

// Closure Sort Functions for Ascending and Descending Order
const sortFuncs: { [key in OrderDirection]: sortFunctionCreator } = {
    ASC: (sortKeys: string[]) => {
        return (a, b) => {
            for (const sortKey of sortKeys) {
                if (a[sortKey] !== b[sortKey]) {
                    return a[sortKey] > b[sortKey] ? 1 : -1;
                }
            }
            return -1;
        };
    },
    DESC: (sortKeys: string[]) => {
        return (a, b) => {
            for (const sortKey of sortKeys) {
                if (a[sortKey] !== b[sortKey]) {
                    return a[sortKey] < b[sortKey] ? 1 : -1;
                }
            }
            return -1;
        };
    },
};

// Class that takes a queryAST and a dataset, applies the query and returns
// the appropriately filtered and sorted dataset
export default class DatasetQuerier {
    constructor() {
        Log.trace("DatasetQuerier::init()");
    }

    public applyQuery(
        queryAST: InsightQueryAST,
        dataset: InsightCourseDataObject[],
    ): InsightCourseDataObject[] {
        // Apply the filter to the dataset:
        let filteredData: InsightCourseDataObject[] = dataset
            // Anon function required for filter to ensure correct binding of 'this' inside matches method
            .filter((courseSection) => queryAST.filter.matches(courseSection));

        // If the query contains a GROUPBY section, group dataObjs
        if (queryAST.groupby) {
            filteredData = this.groupAndAggregateData(queryAST, filteredData);
        }

        // Select only the desired columns from the data:
        const selectedData = filteredData.map((courseSection) => {
            const selectedColData: InsightCourseDataObject = {};
            queryAST.display.forEach((colName: string) => {
                selectedColData[colName] = courseSection[colName];
            });
            return selectedColData;
        });

        // If the query contains an ORDER section, sort appropriately:
        if (queryAST.order) {
            const direction = queryAST.order.direction;
            const sortKeys = queryAST.order.keys;
            selectedData.sort(sortFuncs[direction](sortKeys));
        }

        return selectedData;
    }

    // Groups all data objects according to specified column keys
    // Then Applies any Aggregation operations to the group
    // Returns a dataset containing a single representative member from each group
    private groupAndAggregateData(
        queryAST: InsightQueryAST,
        dataset: InsightCourseDataObject[],
    ): InsightCourseDataObject[] {
        const dataGroups: { [key: string]: InsightCourseDataObject[] } = {};

        dataset.forEach((dataObj) => {
            // For each dataObj, determine its 'groupby' key string:
            const groupKey = queryAST.groupby
                .map((groupCol) => dataObj[groupCol])
                .join("|");

            dataGroups[groupKey] = dataGroups[groupKey] || [];
            dataGroups[groupKey].push(dataObj);
        });

        // Data is now Grouped for applying AGG operations

        // Return a representative member from each group:
        return Object.values(dataGroups).map(
            (dataGroup: InsightCourseDataObject[]) => dataGroup[0],
        );
    }
}
