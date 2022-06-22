import RangeCheckCG, {RANGE_CHECK_ID, RANGE_CHECK_NAME} from "./range_check_gate.js";
import RangeCheckVerifier from "./range_check_verifier.js";
import RangeCheckProver from "./range_check_prover.js";

export default class FactoryCG {
    static create(id, options) {
        if (!id) {
            throw Error("FactoryCG. Unable to create custom gate without its id");
        }

        if (RANGE_CHECK_ID === id) {
            return new RangeCheckCG(options);
        }

        throw Error(`FactoryCG. Unable to create custom gate, ${id} id doesn't exist`);
    }

    static createProver(customGateBase) {
        if (!customGateBase.id) {
            throw Error("FactoryCG. Unable to create custom gate prover without its id");
        }

        if (RANGE_CHECK_ID === customGateBase.id) {
            return new RangeCheckProver(customGateBase);
        }

        throw Error(`FactoryCG. Unable to create custom gate prover, ${customGateBase.id} id doesn't exist`);
    }

    static createVerifier(customGateBase) {
        if (!customGateBase.id) {
            throw Error("FactoryCG. Unable to create custom gate verifier without its id");
        }

        if (RANGE_CHECK_ID === customGateBase.id) {
            return new RangeCheckVerifier(customGateBase);
        }

        throw Error(`FactoryCG. Unable to create custom gate verifier, ${customGateBase.id} id doesn't exist`);
    }

    static createFromName(name, options) {
        if (!name) {
            throw Error("FactoryCG. Unable to create custom gate without its name");
        }

        let _name = name.toUpperCase();

        if(RANGE_CHECK_NAME === _name) {
            return this.create(RANGE_CHECK_ID, options);
        }

        throw Error(`FactoryCG. Unable to create custom gate, "${name}" name doesn't exist`);
    }

}