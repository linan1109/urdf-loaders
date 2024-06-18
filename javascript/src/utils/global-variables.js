const globalVariables = {
    nameObsMap: { // Name to the obs column name mapping
        LF_HAA: 'LF_HAA',
        LF_HFE: 'LF_HFE',
        LF_KFE: 'LF_KFE',
        RF_HAA: 'RF_HAA',
        RF_HFE: 'RF_HFE',
        RF_KFE: 'RF_KFE',
        LH_HAA: 'LH_HAA',
        LH_HFE: 'LH_HFE',
        LH_KFE: 'LH_KFE',
        RH_HAA: 'RH_HAA',
        RH_HFE: 'RH_HFE',
        RH_KFE: 'RH_KFE',
    },
    positionMap: {
        POS_0: 'pos_0',
        POS_1: 'pos_1',
        POS_2: 'pos_2',
        ROT_0: 'rot_0',
        ROT_1: 'rot_1',
        ROT_2: 'rot_2',
    },

    lineColors: {
        noSelection: '#ddd',
        selection: 'Black',
        checked: '#00796B',
        mouseOver: '#FF5722',
    },

    checkedObs: [],
    checkedRobots: [],

    movementIndexStart: 0,
    movementMinLen: Number.MAX_SAFE_INTEGER,

    groupByRobot: true,
    mouseOverObs: null,

    addedRobotCount: 1,

    rightSvgWindowSize: 400,
};

export default globalVariables;
