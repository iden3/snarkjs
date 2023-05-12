/*
    Copyright 2022 iden3 association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/

export class Proof {
    constructor(curve, logger) {
        this.curve = curve;
        this.logger = logger;

        this.resetProof();
    }

    resetProof() {
        this.polynomials = {};
        this.evaluations = {};
    }

    addPolynomial(key, polynomial) {
        if (key in this.polynomials) {
            this.logger.warn(`proof: polynomial.${key} already exist in proof`);
        }
        this.polynomials[key] = polynomial;
    }

    getPolynomial(key) {
        if (!(key in this.polynomials)) {
            this.logger.warn(`proof: polynomial ${key} does not exist in proof`);
        }
        return this.polynomials[key];
    }

    addEvaluation(key, evaluation) {
        if (key in this.evaluations) {
            this.logger.warn(`proof: evaluations.${key} already exist in proof`);
        }
        this.evaluations[key] = evaluation;
    }

    getEvaluation(key) {
        if (!(key in this.evaluations)) {
            this.logger.warn(`proof: evaluation ${key} does not exist in proof`);
        }
        return this.evaluations[key];
    }

    toObjectProof(splitFields = true) {
        let res = splitFields ? {polynomials: {}, evaluations: {}} : {};

        Object.keys(this.polynomials).forEach(key => {
            const value = this.curve.G1.toObject(this.polynomials[key]);
            if(splitFields) {
                res.polynomials[key] = value;
            } else {
                res[key] = value;
            }
        });

        Object.keys(this.evaluations).forEach(key => {
            const value = this.curve.Fr.toObject(this.evaluations[key]);
            if(splitFields) {
                res.evaluations[key] = value;
            } else {
                res[key] = value;
            }
        });

        return res;
    }

    fromObjectProof(objectProof) {
        this.resetProof();

        Object.keys(objectProof.polynomials).forEach(key => {
            this.polynomials[key] = this.curve.G1.fromObject(objectProof.polynomials[key]);
        });

        Object.keys(objectProof.evaluations).forEach(key => {
            this.evaluations[key] = this.curve.Fr.fromObject(objectProof.evaluations[key]);
        });
    }
}