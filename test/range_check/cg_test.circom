pragma circom 2.0.6;
pragma custom_templates;

include "range_check.circom";

template Foo() {
    signal input lower_bound;
    signal input upper_bound;
    signal input to_check;

    component rangeCheck = RangeCheck();

    rangeCheck.lower_bound <== lower_bound;
    rangeCheck.upper_bound <== upper_bound;
    rangeCheck.to_check    <== to_check;
}

component main {public [lower_bound, upper_bound, to_check]} = Foo();
