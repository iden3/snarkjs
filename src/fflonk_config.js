export default function getShPlonkConfig(power, extraMuls) {
    const domainSize = Math.pow(2, power);
    const config = {
        "power": power,
        "polDefs": [
            [
                {"name": "QL", "stage": 0, "degree": domainSize - 1},
                {"name": "QR", "stage": 0, "degree": domainSize - 1},
                {"name": "QO", "stage": 0, "degree": domainSize - 1},
                {"name": "QM", "stage": 0, "degree": domainSize - 1},
                {"name": "QC", "stage": 0, "degree": domainSize - 1},
                {"name": "Sigma1", "stage": 0, "degree": domainSize - 1},
                {"name": "Sigma2", "stage": 0, "degree": domainSize - 1},
                {"name": "Sigma3", "stage": 0, "degree": domainSize - 1},
                {"name": "A", "stage": 1, "degree": domainSize - 1},
                {"name": "B", "stage": 1, "degree": domainSize - 1},
                {"name": "C", "stage": 1, "degree": domainSize - 1},
                {"name": "T0", "stage": 1, "degree": 2*domainSize + 1},
                {"name": "Z",  "stage": 2, "degree": domainSize + 2},
                {"name": "T1", "stage": 2, "degree": domainSize + 1},
                {"name": "T2", "stage": 2, "degree": 3*domainSize -1}
            ],
            [
                {"name": "Z",  "stage": 2, "degree":  domainSize + 2},
                {"name": "T1", "stage": 2, "degree": domainSize + 1},
                {"name": "T2", "stage": 2, "degree": 3*domainSize - 1}
            ]
        ], 
        "extraMuls": extraMuls,
        "openBy": "stage"
    };

    return config;
}

