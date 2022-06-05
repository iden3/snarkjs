customGate RangeCheck() {
    signal input lower_bound;
    signal input upper_bound;
    signal input to_check;

    assert(lower_bound <= to_check && to_check <= upper_bound);
}
