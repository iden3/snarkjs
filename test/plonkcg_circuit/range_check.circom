pragma circom 2.0.6;
pragma custom_templates;

template custom RangeCheck() {
    signal input lower_bound;
    signal input upper_bound;
    signal input to_check;

    assert(lower_bound <= to_check && to_check <= upper_bound);
}