import { expect, assert } from "chai";

import {
    InsightDatasetKind,
    InsightDataQuery,
} from "../src/controller/IInsightFacade";
import { OrderDirection } from "../src/controller/DatasetQuerier";

import QueryStringParser from "../src/controller/QueryStringParser";
import {
    IFilter,
    ALLFilter,
    EQFilter,
    GTFilter,
    LTFilter,
    INCFilter,
    BEGFilter,
    ENDFilter,
    NOTFilter,
    ANDFilter,
    ORFilter,
} from "../src/controller/filters";
import {
    AVGAggregator,
    MINAggregator,
    MAXAggregator,
    SUMAggregator,
    COUNTAggregator,
} from "../src/controller/aggregators";
import Log from "../src/Util";

describe("QueryParser Tests", function () {
    const queryParser = new QueryStringParser();

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    it("parseQuery: Throws error when INPUT contains underscore (SELECT audit FROM cour_ses)", () => {
        const query =
            "In courses dataset cour_ses, find all entries; show Audit.";

        const errMessage = `DATASET INPUT (cour_ses) cannot contain underscore or equal RESERVED strings`;
        const expectedErr = `queryStringParser.parseStringQuery ERROR: Invalid Query: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    it("parseQuery: Throws error when INPUT is a RESERVED string (dataset) (SELECT audit FROM courses)", () => {
        const query =
            "In courses dataset dataset, find all entries; show Audit.";

        const errMessage = `DATASET INPUT (dataset) cannot contain underscore or equal RESERVED strings`;
        const expectedErr = `queryStringParser.parseStringQuery ERROR: Invalid Query: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    it("parseQuery: Throws error when requested DISPLAY col (Seats) does not match KIND (courses)", () => {
        const query =
            "In courses dataset courses, find all entries; show Seats.";

        const errMessage = `Invalid column name in DISPLAY: Seats`;
        const expectedErr = `queryStringParser.parseStringQuery ERROR: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    it("parseQuery: Throws error when requested DISPLAY col (Audit) does not match KIND (rooms)", () => {
        const query = "In rooms dataset rooms, find all entries; show Audit.";

        const errMessage = `Invalid column name in DISPLAY: Audit`;
        const expectedErr = `queryStringParser.parseStringQuery ERROR: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    it("parseQuery: Throws error when requested GROUPBY col (Department) does not match KIND (rooms)", () => {
        const query =
            "In rooms dataset rooms grouped by Department, find all entries; show Department.";

        const errMessage = `Invalid Query: incorrect query syntax`;
        const expectedErr = `queryStringParser.parseStringQuery ERROR: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    it("parseQuery: Throws error when requested GROUPBY col (Full Name) does not match KIND (courses)", () => {
        const query =
            "In courses dataset courses grouped by Full Name, find all entries; show Full Name.";

        const errMessage = `Invalid Query: incorrect query syntax`;
        const expectedErr = `queryStringParser.parseStringQuery ERROR: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    it("parseQuery: Throws error when requested APPLY col (Average) does not match KIND (rooms)", () => {
        const queryDisplayApply =
            "show Full Name and avgGrade, where avgGrade is the AVG of Average.";
        const query = `In rooms dataset rooms grouped by Full Name, find all entries; ${queryDisplayApply}.`;

        const errMessage = `Invalid Query: incorrect query syntax`;
        const expectedErr = `queryStringParser.parseStringQuery ERROR: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    it("parseQuery: Throws error when requested APPLY col (Seats) does not match KIND (courses)", () => {
        const queryDisplayApply =
            "show Department and maxSeats, where maxSeats is the MAX of Seats.";
        const query = `In courses dataset courses grouped by Department, find all entries; ${queryDisplayApply}.`;

        const errMessage = `Invalid Query: incorrect query syntax`;
        const expectedErr = `queryStringParser.parseStringQuery ERROR: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    it("parseQuery: Throws error when requested DISPLAY col (Audit) is not in GROUPBY for grouped query", () => {
        const query =
            "In courses dataset courses grouped by Department and Title, find all entries; show Department and Audit.";

        const errMessage =
            "Invalid DISPLAY semantics when GROUPING - courses_audit not in GROUPBY or AGG";
        const expectedErr = `queryStringParser.parseStringQuery ERROR: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    it("parseQuery: Throws error when aggregation is requested without grouping", () => {
        const queryDisplayApply =
            "show Department; sort in ascending order by maxSeats";
        const query = `In courses dataset courses, find all entries; ${queryDisplayApply}.`;

        const errMessage =
            "Invalid ORDER semantics - column maxSeats not selected in DISPLAY";
        const expectedErr = `queryStringParser.parseStringQuery ERROR: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    it("parseQuery: Throws error when aggregation (maxAvg) is not specified", () => {
        const query =
            "In courses dataset courses grouped by Department, find all entries; show maxAvg.";

        const errMessage =
            "Invalid DISPLAY semantics when GROUPING - maxAvg not in GROUPBY or AGG";
        const expectedErr = `queryStringParser.parseStringQuery ERROR: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    it("parseQuery: Throws error when trying to sort using an unspecified aggregator in a grouped query", () => {
        const queryDisplaySort =
            "show Department; sort in ascending order by maxSeats.";
        const query = `In courses dataset courses grouped by Department, find all entries; ${queryDisplaySort}`;
        const errMessage =
            "Invalid ORDER semantics - column maxSeats not selected in DISPLAY";
        const expectedErr = `queryStringParser.parseStringQuery ERROR: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    it("parseQuery: Throws error when specifying two aggregators with the same name (minGrade)", () => {
        const queryDatasetGroupBy =
            "In courses dataset courses grouped by Department";
        const queryApply =
            "where minGrade is the MIN of Average and minGrade is the MAX of Average.";
        const query = `${queryDatasetGroupBy}, find all entries; show Department, minGrade and maxGrade, ${queryApply}`;

        const errMessage =
            "Multiple Identical Aggregation Names found: minGrade";
        const expectedErr = `queryStringParser.parseStringQuery ERROR: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    it("parseQuery: Throws error when using numeric aggregator on non-numeric column (MAX on UUID)", () => {
        const queryDatasetGroupBy =
            "In courses dataset courses grouped by Department";
        const queryApply = "where maxID is the MAX of ID";
        const query = `${queryDatasetGroupBy}, find all entries; show Department and maxID, ${queryApply}.`;

        const errMessage = "Invalid Query: incorrect query syntax";
        const expectedErr = `queryStringParser.parseStringQuery ERROR: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    it("parseQuery: Parses simple query (SELECT audit FROM courses)", () => {
        const query =
            "In courses dataset courses, find all entries; show Audit.";
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            groupby: null,
            apply: null,
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses simple query requesting three columns (SELECT uuid, avg, audit FROM courses)", () => {
        const queryCols = "UUID, Average and Audit";
        const query = `In courses dataset courses, find all entries; show ${queryCols}.`;
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            groupby: null,
            apply: null,
            display: ["courses_uuid", "courses_avg", "courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses simple query requesting all columns (SELECT * FROM courses)", () => {
        const queryCols =
            "Audit, Average, Department, Fail, ID, Instructor, Pass, Title, UUID and Year";
        const query = `In courses dataset courses, find all entries; show ${queryCols}.`;
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            groupby: null,
            apply: null,
            display: [
                "courses_audit",
                "courses_avg",
                "courses_dept",
                "courses_fail",
                "courses_id",
                "courses_instructor",
                "courses_pass",
                "courses_title",
                "courses_uuid",
                "courses_year",
            ],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with ordering (ASC) (SELECT audit, pass FROM courses ORDER BY pass ASC)", () => {
        const query =
            "In courses dataset courses, find all entries; show Audit and Pass; sort in ascending order by Pass.";
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            groupby: null,
            apply: null,
            display: ["courses_audit", "courses_pass"],
            order: { direction: OrderDirection.asc, keys: ["courses_pass"] },
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with ordering (DESC) (SELECT audit, pass FROM courses ORDER BY pass DESC)", () => {
        const query =
            "In courses dataset courses, find all entries; show Audit and Pass; sort in descending order by Pass.";
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            groupby: null,
            apply: null,
            display: ["courses_audit", "courses_pass"],
            order: { direction: OrderDirection.desc, keys: ["courses_pass"] },
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with two order keys (SELECT fail, pass FROM courses ORDER BY pass, fail ASC)", () => {
        const order = "sort in ascending order by Pass and Fail";
        const query = `In courses dataset courses, find all entries; show Fail and Pass; ${order}.`;
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            groupby: null,
            apply: null,
            display: ["courses_fail", "courses_pass"],
            order: {
                direction: OrderDirection.asc,
                keys: ["courses_pass", "courses_fail"],
            },
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with multiple order keys", () => {
        const order = "sort in descending order by Department, Pass and Fail";
        const query = `In courses dataset courses, find all entries; show Department, Fail and Pass; ${order}.`;
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            groupby: null,
            apply: null,
            display: ["courses_dept", "courses_fail", "courses_pass"],
            order: {
                direction: OrderDirection.desc,
                keys: ["courses_dept", "courses_pass", "courses_fail"],
            },
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Errors on invalid ordering semantics (1) (SELECT audit FROM courses ORDER BY pass ASC)", () => {
        const query =
            "In courses dataset courses, find all entries; show Audit; sort in ascending order by Pass.";

        const errMessage = `Invalid ORDER semantics - column courses_pass not selected in DISPLAY`;
        const expectedErr = `queryStringParser.parseStringQuery ERROR: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    it("parseQuery: Errors on invalid ordering semantics (2) ", () => {
        const order = "sort in descending order by Department, Pass and Audit";
        const query = `In courses dataset courses, find all entries; show Department, Fail and Pass; ${order}.`;

        const errMessage = `Invalid ORDER semantics - column courses_audit not selected in DISPLAY`;
        const expectedErr = `queryStringParser.parseStringQuery ERROR: ${errMessage}`;

        let actualAST;
        let errorMessage;
        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            errorMessage = err.message;
        } finally {
            expect(errorMessage).to.equal(expectedErr);
            expect(actualAST).to.equal(undefined);
        }
    });

    it("parseQuery: Parses query with 'is equal to' filter (SELECT audit FROM courses WHERE audit = 10)", () => {
        const query =
            "In courses dataset courses, find entries whose Audit is equal to 10; show Audit.";
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new EQFilter("courses_audit", 10),
            groupby: null,
            apply: null,
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'is not equal to' filter (SELECT audit FROM courses WHERE audit != 10)", () => {
        const query =
            "In courses dataset courses, find entries whose Audit is not equal to 10; show Audit.";
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new NOTFilter(new EQFilter("courses_audit", 10)),
            groupby: null,
            apply: null,
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'greater than' filter (SELECT audit FROM courses WHERE audit > 10)", () => {
        const query =
            "In courses dataset courses, find entries whose Audit is greater than 10; show Audit.";
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new GTFilter("courses_audit", 10),
            groupby: null,
            apply: null,
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'not greater than' filter (SELECT audit FROM courses WHERE audit <= 10)", () => {
        const query =
            "In courses dataset courses, find entries whose Audit is not greater than 10; show Audit.";
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new NOTFilter(new GTFilter("courses_audit", 10)),
            groupby: null,
            apply: null,
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'less than' filter (SELECT audit FROM courses WHERE audit < 10)", () => {
        const query =
            "In courses dataset courses, find entries whose Audit is less than 10; show Audit.";
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new LTFilter("courses_audit", 10),
            groupby: null,
            apply: null,
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'not less than' filter (SELECT audit FROM courses WHERE audit >= 10)", () => {
        const query =
            "In courses dataset courses, find entries whose Audit is not less than 10; show Audit.";
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new NOTFilter(new LTFilter("courses_audit", 10)),
            groupby: null,
            apply: null,
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'is' filter (SELECT audit FROM courses WHERE dept = \"math\")", () => {
        const query =
            'In courses dataset courses, find entries whose Department is "math"; show Audit.';
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new EQFilter("courses_dept", "math"),
            groupby: null,
            apply: null,
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'is not' filter (SELECT audit FROM courses WHERE dept != \"math\")", () => {
        const query =
            'In courses dataset courses, find entries whose Department is not "math"; show Audit.';
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new NOTFilter(new EQFilter("courses_dept", "math")),
            groupby: null,
            apply: null,
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'includes' filter (SELECT audit FROM courses WHERE dept = \"*math*\")", () => {
        const query =
            'In courses dataset courses, find entries whose Department includes "math"; show Audit.';
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new INCFilter("courses_dept", "math"),
            groupby: null,
            apply: null,
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with '!includes' filter (SELECT audit FROM courses WHERE dept != \"*math*\")", () => {
        const query =
            'In courses dataset courses, find entries whose Department does not include "math"; show Audit.';
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new NOTFilter(new INCFilter("courses_dept", "math")),
            groupby: null,
            apply: null,
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'begins with' filter (SELECT audit FROM courses WHERE dept = \"math*\")", () => {
        const query =
            'In courses dataset courses, find entries whose Department begins with "math"; show Audit.';
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new BEGFilter("courses_dept", "math"),
            groupby: null,
            apply: null,
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it('parseQuery: Parses query with "!begins with" filter (SELECT audit FROM courses WHERE dept!="math*")', () => {
        const query =
            'In courses dataset courses, find entries whose Department does not begin with "math"; show Audit.';
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new NOTFilter(new BEGFilter("courses_dept", "math")),
            groupby: null,
            apply: null,
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with 'ends with' filter (SELECT audit FROM courses WHERE dept = \"*math\")", () => {
        const query =
            'In courses dataset courses, find entries whose Department ends with "math"; show Audit.';
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ENDFilter("courses_dept", "math"),
            groupby: null,
            apply: null,
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with '!ends with' filter (SELECT audit FROM courses WHERE dept != \"*math\")", () => {
        const query =
            'In courses dataset courses, find entries whose Department does not end with "math"; show Audit.';
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new NOTFilter(new ENDFilter("courses_dept", "math")),
            groupby: null,
            apply: null,
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    const ANDTestSQL =
        '(SELECT audit FROM courses WHERE dept = "math" AND audit > 1)';

    it(`parseQuery: Parses query with two conditions (AND) ${ANDTestSQL}`, () => {
        const queryFilter =
            'find entries whose Department is "math" and Audit is greater than 1';
        const query = `In courses dataset courses, ${queryFilter}; show Audit.`;
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ANDFilter(
                new EQFilter("courses_dept", "math"),
                new GTFilter("courses_audit", 1),
            ),
            groupby: null,
            apply: null,
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    const ORTestSQL =
        '(SELECT inst, dept, audit FROM courses WHERE inst = "*bentall*" OR audit > 7)';

    it(`parseQuery: Parses query with two conditions (OR) ${ORTestSQL}`, () => {
        const queryFilter =
            'find entries whose Instructor includes "bentall" or Audit is greater than 7';
        const query = `In courses dataset courses, ${queryFilter}; show Instructor, Department and Audit.`;
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ANDFilter(
                new INCFilter("courses_instructor", "bentall"),
                new GTFilter("courses_audit", 7),
            ),
            groupby: null,
            apply: null,
            display: ["courses_instructor", "courses_dept", "courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    const MultTestSQL =
        '(SELECT dept, id, avg FROM courses WHERE avg>90 AND dep="adhe" OR avg=95 ORDER BY avg ASC)';

    it(`parseQuery: Parses query with multiple conditions ${MultTestSQL}`, () => {
        const queryFilter =
            'find entries whose Average is greater than 90 and Department is "adhe" or Average is equal to 95';
        const queryDisplay = "show Department, ID and Average";
        const queryOrder = "sort in ascending order by Average";

        const query = `In courses dataset courses, ${queryFilter}; ${queryDisplay}; ${queryOrder}.`;

        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ORFilter(
                new ANDFilter(
                    new GTFilter("courses_avg", 90),
                    new EQFilter("courses_dept", "adhe"),
                ),
                new EQFilter("courses_avg", 95),
            ),
            groupby: null,
            apply: null,
            display: ["courses_dept", "courses_id", "courses_avg"],
            order: { direction: OrderDirection.asc, keys: ["courses_avg"] },
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses simple query with GROUPBY (SELECT dept FROM courses GROUP BY dept)", () => {
        const query =
            "In courses dataset courses grouped by Department, find all entries; show Department.";
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            groupby: ["courses_dept"],
            apply: null,
            display: ["courses_dept"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with two column GROUPBY", () => {
        const groupDisplay = "Department and Instructor";
        const query = `In courses dataset courses grouped by ${groupDisplay}, find all entries; show ${groupDisplay}.`;

        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            groupby: ["courses_dept", "courses_instructor"],
            apply: null,
            display: ["courses_dept", "courses_instructor"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with multi column GROUPBY", () => {
        const groupDisplay = "Department, Title and Instructor";
        const query = `In courses dataset courses grouped by ${groupDisplay}, find all entries; show ${groupDisplay}.`;

        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            groupby: ["courses_dept", "courses_title", "courses_instructor"],
            apply: null,
            display: ["courses_dept", "courses_title", "courses_instructor"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with GROUPBY and AVG aggregator (S dept, AVG(avg) F courses GB dept)", () => {
        const qDisplayApply =
            "show Department and avgGrade, where avgGrade is the AVG of Average";
        const query = `In courses dataset courses grouped by Department, find all entries; ${qDisplayApply}.`;
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            groupby: ["courses_dept"],
            apply: [
                {
                    colName: "Average",
                    name: "avgGrade",
                    operation: new AVGAggregator("avgGrade", "courses_avg"),
                },
            ],
            display: ["courses_dept", "avgGrade"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with GROUPBY and MAX aggregator (S dept, MAX(avg) F courses GB dept)", () => {
        const qDisplayApply =
            "show Department and maxGrade, where maxGrade is the MAX of Average";
        const query = `In courses dataset courses grouped by Department, find all entries; ${qDisplayApply}.`;
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            groupby: ["courses_dept"],
            apply: [
                {
                    colName: "Average",
                    name: "maxGrade",
                    operation: new MAXAggregator("maxGrade", "courses_avg"),
                },
            ],
            display: ["courses_dept", "maxGrade"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with GROUPBY and MIN aggregator (S dept, MIN(Year) F courses GB dept)", () => {
        const qDisplayApply =
            "show Department and minYear, where minYear is the MIN of Year";
        const query = `In courses dataset courses grouped by Department, find all entries; ${qDisplayApply}.`;
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            groupby: ["courses_dept"],
            apply: [
                {
                    colName: "Year",
                    name: "minYear",
                    operation: new MINAggregator("minYear", "courses_year"),
                },
            ],
            display: ["courses_dept", "minYear"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with GROUPBY and SUM aggregator (S dept, SUM(Pass) F courses GB dept)", () => {
        const qDisplayApply =
            "show Department and sumPass, where sumPass is the SUM of Pass";
        const query = `In courses dataset courses grouped by Department, find all entries; ${qDisplayApply}.`;
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            groupby: ["courses_dept"],
            apply: [
                {
                    colName: "Pass",
                    name: "sumPass",
                    operation: new MINAggregator("sumPass", "courses_pass"),
                },
            ],
            display: ["courses_dept", "sumPass"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with GROUPBY and COUNT aggregator (S dept, COUNT(inst) F courses GB dept)", () => {
        const qDisplayApply =
            "show Department and countInst, where countInst is the COUNT of Instructor";
        const query = `In courses dataset courses grouped by Department, find all entries; ${qDisplayApply}.`;
        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            groupby: ["courses_dept"],
            apply: [
                {
                    colName: "Instructor",
                    name: "countInst",
                    operation: new MINAggregator(
                        "countInst",
                        "courses_instructor",
                    ),
                },
            ],
            display: ["courses_dept", "countInst"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it("parseQuery: Parses query with multi column GROUPBY and APPLY", () => {
        const queryGroupFilter =
            "Department, Title and Instructor, find all entries";
        const queryDisplay =
            "show Department, Title, Instructor, minGrade and maxGrade, ";
        const queryApply =
            "where minGrade is the MIN of Average and maxGrade is the MAX of Average";
        const query = `In courses dataset courses grouped by ${queryGroupFilter}; ${queryDisplay}${queryApply}.`;

        const expectedAST: InsightDataQuery = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            groupby: ["courses_dept", "courses_title", "courses_instructor"],
            apply: [
                {
                    colName: "Average",
                    name: "minGrade",
                    operation: new MINAggregator("minGrade", "courses_avg"),
                },
                {
                    colName: "Average",
                    name: "maxGrade",
                    operation: new MAXAggregator("maxGrade", "courses_avg"),
                },
            ],
            display: [
                "courses_dept",
                "courses_title",
                "courses_instructor",
                "minGrade",
                "maxGrade",
            ],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    // ROOMS QUERIES
    it(`parseQuery: Parses a simple ROOMS query (SELECT * FROM rooms)`, () => {
        const queryDisplay =
            "show Full Name, Short Name, Number, Name, Address, Type, Furniture, Link, Latitude, Longitude and Seats";

        const query = `In rooms dataset rooms, find all entries; ${queryDisplay}.`;

        const expectedAST: InsightDataQuery = {
            id: "rooms",
            kind: InsightDatasetKind.Rooms,
            filter: new ALLFilter(),
            groupby: null,
            apply: null,
            display: [
                "rooms_fullname",
                "rooms_shortname",
                "rooms_number",
                "rooms_name",
                "rooms_address",
                "rooms_type",
                "rooms_furniture",
                "rooms_href",
                "rooms_lat",
                "rooms_lon",
                "rooms_seats",
            ],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it(`parseQuery: Parses a ROOMS query with a FILTER (SELECT * FROM rooms WHERE fullname="*Hall*")`, () => {
        const queryFilter = 'find entries whose Full Name includes "Hall"';
        const queryDisplay =
            "show Full Name, Short Name, Number, Name, Address, Type, Furniture, Link, Latitude, Longitude and Seats";
        const query = `In rooms dataset rooms, ${queryFilter}; ${queryDisplay}.`;

        const expectedAST: InsightDataQuery = {
            id: "rooms",
            kind: InsightDatasetKind.Rooms,
            filter: new INCFilter("rooms_fullname", "Hall"),
            groupby: null,
            apply: null,
            display: [
                "rooms_fullname",
                "rooms_shortname",
                "rooms_number",
                "rooms_name",
                "rooms_address",
                "rooms_type",
                "rooms_furniture",
                "rooms_href",
                "rooms_lat",
                "rooms_lon",
                "rooms_seats",
            ],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it(`parseQuery: Parses a ROOMS query with GROUP, FILTER, APPLY and SORT`, () => {
        const queryGroup = "grouped by Full Name";
        const queryFilter = 'find entries whose Full Name includes "Hall"';
        const queryDisplayApply =
            "show Full Name and maxSeats, where maxSeats is the MAX of Seats";
        const querySort = "sort in descending order by maxSeats";

        const query = `In rooms dataset rooms ${queryGroup}, ${queryFilter}; ${queryDisplayApply}; ${querySort}.`;

        const expectedAST: InsightDataQuery = {
            id: "rooms",
            kind: InsightDatasetKind.Rooms,
            filter: new INCFilter("rooms_fullname", "Hall"),
            groupby: ["rooms_fullname"],
            apply: [
                {
                    colName: "Seats",
                    name: "maxSeats",
                    operation: new MAXAggregator("maxSeats", "rooms_seats"),
                },
            ],
            display: ["rooms_fullname", "maxSeats"],
            order: { direction: OrderDirection.desc, keys: ["maxSeats"] },
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });

    it(`parseQuery: Parses a complex ROOMS query with multiple GROUP, FILTER, APPLY and SORT`, () => {
        const qGroup = "grouped by Full Name, Address and Type";
        const qFilter =
            'find entries whose Seats is greater than 50 and Address includes "Mall"';
        const qDisplay =
            "show Full Name, Address, minSeats, maxSeats, sumSeats and Type";
        const qApply =
            "minSeats is the MIN of Seats, sumSeats is the SUM of Seats and maxSeats is the MAX of Seats";
        const qSort =
            "sort in ascending order by minSeats, maxSeats and sumSeats";

        const query = `In rooms dataset rooms ${qGroup}, ${qFilter}; ${qDisplay}, where ${qApply}; ${qSort}.`;

        const expectedAST: InsightDataQuery = {
            id: "rooms",
            kind: InsightDatasetKind.Rooms,
            filter: new ANDFilter(
                new GTFilter("rooms_seats", 50),
                new INCFilter("rooms_address", "Mall"),
            ),
            groupby: ["rooms_fullname", "rooms_address", "rooms_type"],
            apply: [
                {
                    colName: "Seats",
                    name: "minSeats",
                    operation: new MINAggregator("minSeats", "rooms_seats"),
                },
                {
                    colName: "Seats",
                    name: "sumSeats",
                    operation: new SUMAggregator("sumSeats", "rooms_seats"),
                },
                {
                    colName: "Seats",
                    name: "maxSeats",
                    operation: new MAXAggregator("maxSeats", "rooms_seats"),
                },
            ],
            display: [
                "rooms_fullname",
                "rooms_address",
                "minSeats",
                "maxSeats",
                "sumSeats",
                "rooms_type",
            ],
            order: {
                direction: OrderDirection.asc,
                keys: ["minSeats", "maxSeats", "sumSeats"],
            },
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQueryString(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });
});
