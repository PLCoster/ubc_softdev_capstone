import { expect, assert } from "chai";

import {
    InsightDatasetKind,
    InsightQueryAST,
} from "../src/controller/IInsightFacade";
import QueryParser from "../src/controller/QueryParser";
import { IFilter, ALLFilter } from "../src/controller/filters";
import Log from "../src/Util";

describe("QueryParser Tests", function () {
    const queryParser = new QueryParser();

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    it("parseQuery: Should successfully parse a simple query (SELECT audit FROM courses)", () => {
        const query =
            "In courses dataset courses, find all entries; show Audit.";
        const expectedAST: InsightQueryAST = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            filter: new ALLFilter(),
            display: ["courses_audit"],
            order: null,
        };
        let actualAST;

        try {
            actualAST = queryParser.parseQuery(query);
        } catch (err) {
            assert.fail(
                `No error should be thrown on valid query - ERROR: ${err.message}`,
            );
        } finally {
            expect(actualAST).to.deep.equal(expectedAST);
        }
    });
});
