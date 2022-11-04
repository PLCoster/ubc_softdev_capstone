import { InsightAggregatorKind } from "../IInsightFacade";

import {
    IAggregator,
    AVGAggregator,
    MAXAggregator,
    MINAggregator,
    SUMAggregator,
    COUNTAggregator,
} from "../aggregators";

/**
 * This file contains an object allowing translation from a query aggregation string
 * (e.g. 'AVG') to the appropriate IAggregator (e.g. AVGAggregator), as well as info
 * about the datatype that the aggregator can be applied to
 */

export const queryAggNameToIAggregatorInfo: {
    [key in InsightAggregatorKind]: {
        Aggregator: new (
            aggColName: string,
            applyColName: string,
        ) => IAggregator;
        aggType: "number" | "all";
    };
} = {
    AVG: { Aggregator: AVGAggregator, aggType: "number" },
    MAX: { Aggregator: MAXAggregator, aggType: "number" },
    MIN: { Aggregator: MINAggregator, aggType: "number" },
    SUM: { Aggregator: SUMAggregator, aggType: "number" },
    COUNT: { Aggregator: COUNTAggregator, aggType: "all" },
};
