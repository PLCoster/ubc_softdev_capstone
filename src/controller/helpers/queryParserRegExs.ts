/**
 * This file holds various RegExs in order to validate and parse a query string
 */

// RE for all possible courses column names
export const cColNameRE =
    /Average|Pass|Fail|Audit|Department|ID|Instructor|Title|UUID|Year/;

// RE for all possible rooms column names
const rColNameRE =
    /Full Name|Short Name|Number|Name|Address|Type|Furniture|Link|Latitude|Longitude|Seats/;

// RE relating to numerical data columns
const cNumColRE = /(?:Average|Pass|Fail|Audit|Year)/;
const rNumColRE = /(?:Latitude|Longitude|Seats)/;

const numberOPRE = /(?:is (?:not )?(?:greater than|less than|equal to))/;
const numberRE = /(?:(?:-)?(?:[1-9][0-9]*|0)(?:[.][0-9]+)?)/;

// REs for a numerical column filter condition
const cNumFilterRE = RegExp(
    `(?:${cNumColRE.source} ${numberOPRE.source} ${numberRE.source})`,
);
const rNumFilterRE = RegExp(
    `(?:${rNumColRE.source} ${numberOPRE.source} ${numberRE.source})`,
);

// RE relating to string data columns
const cStrColRE = /(?:Department|ID|Instructor|Title|UUID)/;
const rStrColRE =
    /(?:Full Name|Short Name|Number|Name|Address|Type|Furniture|Link)/;

const stringOPRE =
    /(?:is(?: not)?|includes|does not include|(?:begins|does not begin|ends|does not end) with)/;
const stringRE = /"(?:[^*"]*)"/;

// REs for a string column filter condition
const cStrFilterRE = RegExp(
    `(?:${cStrColRE.source} ${stringOPRE.source} ${stringRE.source})`,
);
const rStrFilterRE = RegExp(
    `(?:${rStrColRE.source} ${stringOPRE.source} ${stringRE.source})`,
);

// REs for a single filter condition (numerical condition or string condition)
const cOneFilterRE = RegExp(
    `(?:${cNumFilterRE.source}|${cStrFilterRE.source})`,
);
const rOneFilterRE = RegExp(
    `(?:${rNumFilterRE.source}|${rStrFilterRE.source})`,
);

// REs to capture DATASET section of query string
const cDatasetRE = /(?<DATASET>In courses dataset \S+)/;
const rDatasetRE = /(?<DATASET>In rooms dataset \S+)/;

// REs to capture FILTER section of query string
const cFilterRE = new RegExp(
    `(?<FILTER>find entries whose (?:${cOneFilterRE.source} (?:and|or) )*${cOneFilterRE.source}|find all entries)`,
);
const rFilterRE = new RegExp(
    `(?<FILTER>find entries whose (?:${rOneFilterRE.source} (?:and|or) )*${rOneFilterRE.source}|find all entries)`,
);

// REs to capture DISPLAY section of query string
const cDisplaySingleRE = new RegExp(`(?:${cColNameRE.source}|\\S+)`);
const cDisplayTwoRE = new RegExp(
    `(?:${cDisplaySingleRE.source} and ${cDisplaySingleRE.source})`,
);
const cDisplayMultRE = new RegExp(
    `(?:(?:${cDisplaySingleRE.source}, )*${cDisplayTwoRE.source})`,
);

const rDisplaySingleRE = new RegExp(`(?:${rColNameRE.source}|\\S+)`);
const rDisplayTwoRE = new RegExp(
    `(?:${rDisplaySingleRE.source} and ${rDisplaySingleRE.source})`,
);
const rDisplayMultRE = new RegExp(
    `(?:(?:${rDisplaySingleRE.source}, )*${rDisplayTwoRE.source})`,
);

const cDisplayRE = new RegExp(
    `(?<DISPLAY>${cDisplayMultRE.source}|${cDisplaySingleRE.source})`,
);
const rDisplayRE = new RegExp(
    `(?<DISPLAY>${rDisplayMultRE.source}|${rDisplaySingleRE.source})`,
);

// REs to capture GROUPBY section of query string
const cGroupBySingleRE = new RegExp(`(?:${cColNameRE.source})`);
const cGroupByTwoRE = new RegExp(
    `(?:${cGroupBySingleRE.source} and ${cGroupBySingleRE.source})`,
);
const cGroupByMultRE = new RegExp(
    `(?:(?:${cGroupBySingleRE.source}, )*${cGroupByTwoRE.source})`,
);

const rGroupBySingleRE = new RegExp(`(?:${rColNameRE.source})`);
const rGroupByTwoRE = new RegExp(
    `(?:${rGroupBySingleRE.source} and ${rGroupBySingleRE.source})`,
);
const rGroupByMultRE = new RegExp(
    `(?:(?:${rGroupBySingleRE.source}, )*${rGroupByTwoRE.source})`,
);

const cGroupByRE = new RegExp(
    `(?: grouped by (?<GROUPBY>${cGroupByMultRE.source}|${cGroupBySingleRE.source}))?`,
);
const rGroupByRE = new RegExp(
    `(?: grouped by (?<GROUPBY>${rGroupByMultRE.source}|${rGroupBySingleRE.source}))?`,
);

// REs to capture APPLY(aggregation) section of query string
const numAggRE = /(?:MAX|MIN|AVG|SUM)/;
const strOrNumAggRE = /(?:COUNT)/;

const cAggColRE = new RegExp(
    `(?:${numAggRE.source} of ${cNumColRE.source}|${strOrNumAggRE.source} of (?:${cColNameRE.source}))`,
);

const cSingleAggRE = new RegExp(`(?:\\S+ is the ${cAggColRE.source})`);
const cMultipleAggRE = new RegExp(
    `(?:${cSingleAggRE.source}, )*(?:${cSingleAggRE.source}) and (?:${cSingleAggRE.source})`,
);

const cApplyRE = new RegExp(
    `(?<APPLY>${cMultipleAggRE.source}|${cSingleAggRE.source})`,
);

const rAggColRE = new RegExp(
    `(?:${numAggRE.source} of ${rNumColRE.source}|${strOrNumAggRE.source} of (?:${rColNameRE.source}))`,
);

const rSingleAggRE = new RegExp(`(?:\\S+ is the ${rAggColRE.source})`);
const rMultipleAggRE = new RegExp(
    `(?:${rSingleAggRE.source}, )*(?:${rSingleAggRE.source}) and (?:${rSingleAggRE.source})`,
);

const rApplyRE = new RegExp(
    `(?<APPLY>${rMultipleAggRE.source}|${rSingleAggRE.source})`,
);

// REs to capture ORDER section of query string
const cSingleOrderRE = new RegExp(`(?:${cColNameRE.source}|\\S+)`);
const rSingleOrderRE = new RegExp(`(?:${rColNameRE.source}|\\S+)`);

const cMultipleOrderRE = new RegExp(
    `(?:(?:${cSingleOrderRE.source}), )*(?:${cSingleOrderRE.source}) and (?:${cSingleOrderRE.source})`,
);
const rMultipleOrderRE = new RegExp(
    `(?:(?:${rSingleOrderRE.source}), )*(?:${rSingleOrderRE.source}) and (?:${rSingleOrderRE.source})`,
);

const cOrderRE = new RegExp(
    `(?<ORDER>sort in (?:ascending|descending) order by (?:${cMultipleOrderRE.source}|${cSingleOrderRE.source}))`,
);
const rOrderRE = new RegExp(
    `(?<ORDER>sort in (?:ascending|descending) order by (?:${rMultipleOrderRE.source}|${rSingleOrderRE.source}))`,
);

// REs to validate entire query and extract DATASET, FILTER, DISPLAY, ORDER
const cQueryDatasetGroupByFilterRE = new RegExp(
    `${cDatasetRE.source}${cGroupByRE.source}, ${cFilterRE.source}`,
);

const cDisplayApplyOrderRE = new RegExp(
    `show ${cDisplayRE.source}(?:, where ${cApplyRE.source})?(?:; ${cOrderRE.source})?`,
);

export const cQueryRE = new RegExp(
    `^${cQueryDatasetGroupByFilterRE.source}; ${cDisplayApplyOrderRE.source}[.]$`,
);

const rQueryDatasetGroupByFilterRE = new RegExp(
    `${rDatasetRE.source}${rGroupByRE.source}, ${rFilterRE.source}`,
);

const rDisplayApplyOrderRE = new RegExp(
    `show ${rDisplayRE.source}(?:, where ${rApplyRE.source})?(?:; ${rOrderRE.source})?`,
);

export const rQueryRE = new RegExp(
    `^${rQueryDatasetGroupByFilterRE.source}; ${rDisplayApplyOrderRE.source}[.]$`,
);

// RE to extract KIND and INPUT name from DATASET section of query
const cInputKindRE = /^In (?<KIND>courses) dataset (?<INPUT>\S+)$/;
const rInputKindRE = /^In (?<KIND>rooms) dataset (?<INPUT>\S+)$/;

// REs to extract CONDITION, VALUE and COLNAME from FILTER section of query
const filterConditionRE = new RegExp(
    `(?<CONDITION>${numberOPRE.source}|${stringOPRE.source})`,
);
const filterValueRE = new RegExp(
    `(?<VALUE>${numberRE.source}|${stringRE.source})`,
);

const cFilterDetailsRE = new RegExp(
    `^(?<COLNAME>${cColNameRE.source}) ${filterConditionRE.source} ${filterValueRE.source}$`,
);
const rFilterDetailsRE = new RegExp(
    `^(?<COLNAME>${rColNameRE.source}) ${filterConditionRE.source} ${filterValueRE.source}$`,
);

// REs to extract NAME, OPERATION and COLNAM from APPLY section(s)
const aggOpRE = /MAX|MIN|AVG|SUM|COUNT/;

const cAggNameOpColRE = new RegExp(
    `^(?<NAME>\\S+) is the (?<OPERATION>${aggOpRE.source}) of (?<COLNAME>${cColNameRE.source})$`,
);

const rAggNameOpColRE = new RegExp(
    `^(?<NAME>\\S+) is the (?<OPERATION>${aggOpRE.source}) of (?<COLNAME>${rColNameRE.source})$`,
);

// REs to extract DIRECTION and COLNAME from ORDER section of query
const directionRE = /(?<DIRECTION>ascending|descending)/;

const cSortDirectionColRE = new RegExp(
    `^sort in ${directionRE.source} order by (?<COLNAMES>${cMultipleOrderRE.source}|${cSingleOrderRE.source})$`,
);
const rSortDirectionColRE = new RegExp(
    `^sort in ${directionRE.source} order by (?<COLNAMES>${rMultipleOrderRE.source}|${rSingleOrderRE.source})$`,
);

// RE for RESERVED strings (INPUT cannot be equal to any of these):
const keywordRE =
    /(?:In|dataset|find|all|show|and|or|sort|by|entries|is|the|of|whose|grouped|where)/;

export const reservedRE = new RegExp(
    `^${keywordRE.source}$|^${numberOPRE.source}$|^${stringOPRE.source}$|^(?:${aggOpRE.source})$`,
);

// Interface and implentations that contain relevant RegExs for Course/Room queries
export interface QuerySectionREs {
    colNameRE: RegExp;
    inputKindRE: RegExp;
    singleFilterRE: RegExp;
    filterDetailRE: RegExp;
    aggNameOpColRE: RegExp;
    sortDirectionColRE: RegExp;
    colTypeREs: { all: RegExp; number: RegExp };
}

export const courseQuerySectionREs: QuerySectionREs = {
    colNameRE: new RegExp(`^(?:${cColNameRE.source})$`),
    inputKindRE: cInputKindRE,
    singleFilterRE: cOneFilterRE,
    filterDetailRE: cFilterDetailsRE,
    aggNameOpColRE: cAggNameOpColRE,
    sortDirectionColRE: cSortDirectionColRE,
    colTypeREs: {
        all: new RegExp(`^${cColNameRE.source}$`),
        number: new RegExp(`^${cNumColRE.source}$`),
    },
};

export const roomsQuerySectionREs: QuerySectionREs = {
    colNameRE: new RegExp(`^(?:${rColNameRE.source})$`),
    inputKindRE: rInputKindRE,
    singleFilterRE: rOneFilterRE,
    filterDetailRE: rFilterDetailsRE,
    aggNameOpColRE: rAggNameOpColRE,
    sortDirectionColRE: rSortDirectionColRE,
    colTypeREs: {
        all: new RegExp(`^${rColNameRE.source}$`),
        number: new RegExp(`^${rNumColRE.source}$`),
    },
};
