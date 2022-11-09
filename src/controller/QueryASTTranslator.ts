import {
    InsightDatasetKind,
    InsightDataQuery,
    InsightDataQueryApplyObject,
    InsightAggregatorKind,
    InsightASTQueryOrderObject,
    InsightASTQueryOrderDir,
    InsightASTQuery,
} from "./IInsightFacade";
import { OrderDirection } from "./DatasetQuerier";

import { IFilter, ALLFilter, NOTFilter, ANDFilter, ORFilter } from "./filters";
import Log from "../Util";

import { reservedRE } from "./helpers/queryParserRegExs";
import { conditionKeyToIFilterInfo } from "./helpers/conditionStringToIFilterInfo";
import { queryAggNameToIAggregatorInfo } from "./helpers/queryAggNameToIAggregatorInfo";
import { strQueryColNamesToKeyAndType } from "./helpers/columnKeyInfo";

// This class takes in a Query AST Object, validates it and returns the corresponding
// InsightDataQuery Object to be used by DatasetQuerier
export default class QueryASTTranslator {
    constructor() {
        Log.trace("QueryASTTranslator::init()");
    }

    // Translates a Query AST Object to InsightDataQuery for DataQuerier
    public translateQueryAST(query: InsightASTQuery): InsightDataQuery {
        // First check that the Query Object is valid - will reject if invalid
        this.validateASTQuery(query);

        const { ID: id, KIND: kind } = query;

        const filter = this.parseWHERE(query.WHERE);
        const display = query.OPTIONS.COLUMNS;

        // Begin constructing QueryAST
        const queryAST: InsightDataQuery = {
            id,
            kind,
            filter,
            groupby: null,
            apply: null,
            display,
            order: null,
        };

        if (query.OPTIONS.ORDER) {
            queryAST.order = this.parseORDER(query.OPTIONS.ORDER);
        }

        // Query desires Grouping
        if (query.TRANSFORMATIONS && query.TRANSFORMATIONS.GROUP) {
            queryAST.groupby = query.TRANSFORMATIONS.GROUP;

            if (query.TRANSFORMATIONS.APPLY) {
                queryAST.apply = this.parseAPPLY(
                    id,
                    kind,
                    query.TRANSFORMATIONS.APPLY,
                );
            }
        }

        return queryAST;
    }

    /**
     * Helper method to check that Query AST Object is valid before
     * building the query from it.
     *
     * If the query is not valid the method throws an error by calling
     * the rejectQuery() method
     *
     * @param query Query AST Object to be validated
     */
    private validateASTQuery(query: InsightASTQuery): boolean {
        // Validate Dataset Name
        if (!query.ID || typeof query.ID !== "string") {
            this.rejectQuery(`Invalid Query: No Dataset ID was given`);
        }

        const queryID: string = query.ID;

        // Validate id and kind
        if (
            queryID.includes("_") ||
            queryID.includes(" ") ||
            reservedRE.test(queryID)
        ) {
            this.rejectQuery(
                `Invalid Query: Dataset ID cannot contain '_', ' ' or equal RESERVED, got: ${queryID}`,
            );
        }

        // Validate Dataset Kind
        if (!Object.values(InsightDatasetKind).includes(query.KIND)) {
            this.rejectQuery(
                `Invalid Query: Dataset KIND can only be 'courses' or 'rooms', got: ${query.KIND}`,
            );
        }

        // Validate WHERE Section of query
        if (query.WHERE === undefined || typeof query.WHERE !== "object") {
            this.rejectQuery(
                `Invalid Query: Query contained no valid WHERE section - include WHERE:{} if no filters are required`,
            );
        }

        if (Object.keys(query.WHERE).length > 0) {
            // Recursively validate all of WHERE
            this.validateWhere(queryID, query.KIND, query.WHERE);
        }

        // Validate COLUMNS Section of query
        if (
            query.OPTIONS === undefined ||
            query.OPTIONS.COLUMNS === undefined ||
            !Array.isArray(query.OPTIONS.COLUMNS) ||
            query.OPTIONS.COLUMNS.length === 0
        ) {
            this.rejectQuery(
                `Invalid Query: Query contained no COLUMNS to display`,
            );
        }

        const queryColumns = query.OPTIONS.COLUMNS;

        // Validate TRANSFORMATIONS section of query
        if (query.TRANSFORMATIONS !== undefined) {
            const queryGroup = query.TRANSFORMATIONS.GROUP;
            const queryApply = query.TRANSFORMATIONS.APPLY;

            if (
                !queryGroup ||
                !Array.isArray(queryGroup) ||
                queryGroup.length === 0
            ) {
                this.rejectQuery(
                    `Invalid Query: Empty or invalid GROUP operation - all TRANSFORMATIONS require min. 1 GROUP key`,
                );
            }

            const customAggNames = new Set();

            // Validate APPLY Section of Query Object
            if (queryApply !== undefined) {
                if (!Array.isArray(queryApply) || queryApply.length === 0) {
                    this.rejectQuery(
                        `Invalid Query: Empty or invalid APPLY section`,
                    );
                }

                queryApply.forEach((apply) => {
                    const name = Object.keys(apply)[0];
                    const aggOp = Object.keys(
                        apply[name],
                    )[0] as InsightAggregatorKind;

                    // Check Aggregation Name is valid
                    // No spaces, underscores or equal to RESERVED
                    if (
                        name.includes("_") ||
                        name.includes(" ") ||
                        reservedRE.test(name)
                    ) {
                        this.rejectQuery(
                            `Invalid Query: Invalid Aggregation Name: ${name}`,
                        );
                    }

                    // Check custom Aggregation Name is unique
                    if (customAggNames.has(name)) {
                        this.rejectQuery(
                            `Invalid Query: Multiple aggregations with the same now not allowed: ${name}`,
                        );
                    }

                    customAggNames.add(name);

                    // Check Aggregation Operation Name is valid
                    if (!Object.values(InsightAggregatorKind).includes(aggOp)) {
                        this.rejectQuery(
                            `Invalid Query: Unrecognised Aggregation Operation: ${aggOp}`,
                        );
                    }

                    const aggInfo = queryAggNameToIAggregatorInfo[aggOp];
                    const colName = apply[name][aggOp];

                    // Check the name of the column to be aggregated is valid
                    if (
                        !this.validateQueryASTColName(
                            queryID,
                            query.KIND,
                            colName,
                        )
                    ) {
                        this.rejectQuery(
                            `Invalid Query: Invalid column name for APPLY: ${colName}`,
                        );
                    }

                    // Check that the colName is valid for the dataset kind
                    const [strColName, { key: colKey, type: colType }] =
                        this.getColDetailsFromKeyAndKind(
                            colName.split("_")[1],
                            query.KIND,
                        );

                    // Ensure the aggregation operation is valid for the given column:
                    if (aggInfo.aggType === "number" && colType !== "number") {
                        this.rejectQuery(
                            `Invalid Query: Aggregation type ${aggOp} cannot be applied to ${strColName} column`,
                        );
                    }
                });
            }

            // We can only DISPLAY/COLUMNS that are GROUP or APPLY
            const applyColNames = queryApply
                ? queryApply.map((applyObj) => Object.keys(applyObj)[0])
                : [];

            queryColumns.forEach((colName) => {
                // If it is a valid column name it must be in GROUP
                const validColName = this.validateQueryASTColName(
                    query.ID,
                    query.KIND,
                    colName,
                );
                if (validColName && !queryGroup.includes(colName)) {
                    this.rejectQuery(
                        `Invalid Query: When GROUP present COLUMNS must be in GROUP or APPLY, got: ${colName}`,
                    );
                } else if (!validColName && !applyColNames.includes(colName)) {
                    // Not a regular columns and we have not defined it as an aggregator name
                    this.rejectQuery(
                        `Invalid Query: Unrecognised column name ${colName} in COLUMNS`,
                    );
                }
            });
        } else {
            // No TRANSFORMATIONS, DISPLAY/COLUMNS must all be valid
            queryColumns.forEach((colName) => {
                if (
                    !this.validateQueryASTColName(query.ID, query.KIND, colName)
                ) {
                    this.rejectQuery(
                        `Invalid Query: Invalid column name ${colName} in COLUMNS`,
                    );
                }
            });
        }

        // Validate ORDER Section - Can only ORDER by DISPLAY/COLUMNS
        if (query.OPTIONS.ORDER !== undefined) {
            const queryOrder = query.OPTIONS.ORDER;

            if (typeof queryOrder === "string") {
                // Basic Ordering Format - single query order ASCENDING
                // ORDER column must also be in COLUMNS / DISPLAY
                if (!queryColumns.includes(queryOrder)) {
                    this.rejectQuery(
                        `Invalid Query: ORDER columns must be in COLUMNS, got ${queryOrder}`,
                    );
                }
            } else {
                const queryOrderObj = queryOrder as InsightASTQueryOrderObject;

                if (
                    !queryOrderObj.dir ||
                    !Object.values(InsightASTQueryOrderDir).includes(
                        queryOrderObj.dir,
                    )
                ) {
                    this.rejectQuery(
                        `Invalid Query: 'dir' property of ORDER Invalid: ${queryOrder}`,
                    );
                }

                const queryOrderKeys = queryOrderObj.keys;

                if (
                    !queryOrderKeys ||
                    !Array.isArray(queryOrderKeys) ||
                    !queryOrderKeys.length
                ) {
                    this.rejectQuery(
                        `Invalid Query: No keys specified in 'keys' property of ORDER: ${queryOrder}`,
                    );
                }

                // No ORDER key can be duplicated
                const orderKeys = new Set();

                // All ORDER keys must be in DISPLAY/COLUMNS
                queryOrderKeys.forEach((key) => {
                    if (!queryColumns.includes(key)) {
                        this.rejectQuery(
                            `Invalid Query: Cannot ORDER by column not in COLUMNS, got: ${key}`,
                        );
                    }

                    if (orderKeys.has(key)) {
                        this.rejectQuery(
                            `Invalid Query: Cannot ORDER by the same column multiple times: ${key}`,
                        );
                    }
                    orderKeys.add(key);
                });
            }
        }

        return true;
    }

    private validateWhere(
        datasetID: string,
        datasetKind: InsightDatasetKind,
        whereObj: any,
    ): boolean {
        const conditionKey = Object.keys(whereObj)[0];

        if (!conditionKey || Object.keys(whereObj).length > 1) {
            this.rejectQuery(
                `Invalid Query: Invalid WHERE section of query: ${JSON.stringify(
                    whereObj,
                )}`,
            );
        }

        // Logical combination conditional -> process all sub-conditionals
        if (conditionKey === "AND" || conditionKey === "OR") {
            const conditionArr = whereObj[conditionKey];
            if (
                !conditionArr ||
                !Array.isArray(conditionArr) ||
                conditionArr.length !== 2
            ) {
                this.rejectQuery(
                    `Invalid Query: Invalid WHERE logical condition: ${JSON.stringify(
                        whereObj,
                    )}`,
                );
            }

            conditionArr.forEach((subCondition: any) => {
                this.validateWhere(datasetID, datasetKind, subCondition);
            });

            return true;
        }

        // NOT logical conditional -> Validate its sub-condition
        if (conditionKey === "NOT") {
            const subCondition = whereObj[conditionKey];
            return this.validateWhere(datasetID, datasetKind, subCondition);
        }

        // Single conditional
        if (conditionKeyToIFilterInfo.hasOwnProperty(conditionKey)) {
            if (
                typeof whereObj[conditionKey] !== "object" ||
                Object.keys(whereObj[conditionKey]).length !== 1
            ) {
                this.rejectQuery(
                    `Invalid Query: Invalid WHERE single condition: ${JSON.stringify(
                        whereObj,
                    )}`,
                );
            }

            // Check colName is valid for dataset ID and Kind
            const colName = Object.keys(whereObj[conditionKey])[0];
            this.validateQueryASTColName(datasetID, datasetKind, colName);

            // Check that condition value, conditionKey and column are all
            // the same type (number or string):
            const colKey = colName.split("_")[1];
            const [stringColName, { type: colType }] =
                this.getColDetailsFromKeyAndKind(colKey, datasetKind);

            const conditionVal = whereObj[conditionKey][colName];
            const valueType = typeof conditionVal;
            const { conditionType } = conditionKeyToIFilterInfo[conditionKey];

            if (valueType !== conditionType || colType !== conditionType) {
                this.rejectQuery(
                    `Invalid Query: Type mismatch in WHERE condition: ${JSON.stringify(
                        whereObj,
                    )}`,
                );
            }

            // If the type is string, check that the string is valid (no '*' or '"')
            if (
                valueType === "string" &&
                (conditionVal.includes("*") || conditionVal.includes('"'))
            ) {
                this.rejectQuery(
                    `Invalid Query: WHERE condition string cannot include '*' or '_', got: ${conditionVal}`,
                );
            }

            return true;
        } else {
            // Invalid condition key in WHERE
            this.rejectQuery(
                `Invalid Query: Invalid key in WHERE: ${conditionKey}`,
            );
        }
    }

    /**
     * Helper function to validate that a given column name in Query AST Object is valid
     * e.g. courses_avg is valid for a 'courses' kind dataset, where courses_furniture
     * would be invalid
     * @param datasetID the id of the dataset that is being queried
     * @param datasetKind the dataset kind of the dataset being queried (courses | rooms)
     * @param queryColName the column name in the Query AST Object
     */
    private validateQueryASTColName(
        datasetID: string,
        datasetKind: InsightDatasetKind,
        queryColName: string,
    ): boolean {
        const nameSections = queryColName.split("_");

        if (nameSections.length !== 2) {
            return false;
        }

        const [colID, colKey] = nameSections;

        if (colID !== datasetID) {
            return false;
        }

        // Check that the colKey is valid for the dataset kind
        const matchingColumn = this.getColDetailsFromKeyAndKind(
            colKey,
            datasetKind,
        );

        // If we find no matching Column, the column key was not valid
        if (!matchingColumn) {
            return false;
        }

        // Otherwise the column name is valid for dataset id and kind
        return true;
    }

    /**
     * Helper method that given a requested column key e.g. 'avg'
     * and the dataset kind being queried, returns details about
     * the associated column, if it is a valid key for a column in
     * the given dataset kind.
     *
     * @param colKey string key of column to get details of
     * @param datasetKind the dataset KIND being queried
     */
    private getColDetailsFromKeyAndKind(
        colKey: string,
        datasetKind: InsightDatasetKind,
    ): [string, { key: string; type: "number" | "string" }] {
        const validColNames = Object.entries(
            strQueryColNamesToKeyAndType[datasetKind],
        );

        const colMatch = validColNames.filter(
            ([stringColName, { key, type }]) => {
                return key === colKey;
            },
        );

        return colMatch[0];
    }

    /**
     * Parses the WHERE section of Query AST Object
     * Assumes the Query Object has been validated
     * Returns an IFilter representing the given combination of Conditions
     *
     * @param whereObj the nested WHERE (FILTER) Object from the Query AST Object
     */
    private parseWHERE(whereObj: any): IFilter {
        // If no Filter conditions, return all rows
        if (Object.keys(whereObj).length === 0) {
            return new ALLFilter();
        }

        const conditionKey = Object.keys(whereObj)[0];

        if (conditionKey === "AND" || conditionKey === "OR") {
            const filter = conditionKey === "AND" ? ANDFilter : ORFilter;
            return new filter(
                this.parseWHERE(whereObj[conditionKey][0]),
                this.parseWHERE(whereObj[conditionKey][1]),
            );
        } else if (conditionKey === "NOT") {
            return new NOTFilter(this.parseWHERE(whereObj[conditionKey]));
        } else {
            // Single condition filter
            const { filter } = conditionKeyToIFilterInfo[conditionKey];
            const colName = Object.keys(whereObj[conditionKey])[0];
            const columnValue = whereObj[conditionKey][colName];

            return new filter(colName, columnValue);
        }
    }

    /**
     * Parses the ORDER section of Query AST Object
     * Assumes the Query Object has been validated
     * Returns a Query AST 'order' object for DatasetQuerier
     *
     * @param orderObj the ORDER section of the Query AST
     */
    private parseORDER(orderObj: string | InsightASTQueryOrderObject): {
        direction: OrderDirection;
        keys: string[];
    } {
        if (typeof orderObj === "string") {
            return { direction: OrderDirection.asc, keys: [orderObj] };
        }

        const { dir, keys } = orderObj;

        if (dir === "UP") {
            return { direction: OrderDirection.asc, keys };
        } else {
            return { direction: OrderDirection.desc, keys };
        }
    }

    /**
     * Parses the APPLY section of Query AST Object
     * Assumes the Query Object has been validated
     * Returns a Query AST 'apply' Array of InsightQueryASTApplyObject for DataQuerier
     *
     * @param id id of the dataset we are applying the query to
     * @param kind the dataset kind we are applying the query to
     * @param applyArr the APPLY section of the Query AST
     */
    private parseAPPLY(
        id: string,
        kind: InsightDatasetKind,
        applyARR: Array<{
            [key: string]: { [key in InsightAggregatorKind]?: string };
        }>,
    ): InsightDataQueryApplyObject[] {
        const applyObjArr: InsightDataQueryApplyObject[] = [];

        applyARR.forEach((apply) => {
            const name = Object.keys(apply)[0];
            const aggName = Object.keys(
                apply[name],
            )[0] as InsightAggregatorKind;

            const aggInfo = queryAggNameToIAggregatorInfo[aggName];
            const colName = apply[name][aggName];

            const operation = new aggInfo.Aggregator(name, colName);

            applyObjArr.push({ name, operation, colName });
        });

        return applyObjArr;
    }

    private rejectQuery(message: string) {
        throw new Error(
            `QueryASTTranslator.translateQueryAST ERROR: ${message}`,
        );
    }
}
