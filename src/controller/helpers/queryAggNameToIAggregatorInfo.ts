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
        aggType: "numeric" | "all";
    };
} = {
    AVG: { Aggregator: AVGAggregator, aggType: "numeric" },
    MAX: { Aggregator: MAXAggregator, aggType: "numeric" },
    MIN: { Aggregator: MINAggregator, aggType: "numeric" },
    SUM: { Aggregator: SUMAggregator, aggType: "numeric" },
    COUNT: { Aggregator: COUNTAggregator, aggType: "all" },
};
