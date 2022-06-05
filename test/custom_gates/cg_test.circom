pragma ultraPlonk;

include "range_check.circom";

template Foo() {
    signal input lower_bound;
    signal input upper_bound;
    signal input to_check;

    custom_component rangeCheck = RangeCheck();

    rangeCheck.lower_bound <== lower_bound;
    rangeCheck.upper_bound <== upper_bound;
    rangeCheck.to_check    <== to_check;
}

component main = Foo();
