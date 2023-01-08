# Final (Range) Plookup Protocol, Rolled Out

## Terminology \& Notation

We consider $\mathbb{F}$ a finite field of prime order $p$, i.e., $\mathbb{F} = \mathbb{Z}_p$.
For a given integer $n$, we denote by $[n]$ the set of integers $\{1,...,n\}$.
We explicitly define the multiplicative subgroup $H\subset\mathbb{F}$ as the subgroup containing the $n$-th roots of unity in $\mathbb{F}$, where $\omega$ is a primitive $n$-th root of unity and a generator of $H$. That is,
$$
H = \{\omega, \dots, \omega^{n-1}, \omega^n = 1\}.
$$

We denote by $\mathbb{F}_{<n}[X]$ the set of univariate polynomials over $\mathbb{F}$ of degree strictly smaller than $n$.

For a polynomial $f(x) \in \mathbb{F}_{<n}[X]$ and $i \in [n]$, we sometimes denote $f_i := f(\omega^i)$. For a vector $\boldsymbol{f} \in \mathbb{F}^n$, we also denote by $f(x)$ the polynomial in $\mathbb{F}_{<n}[X]$ with $f(\omega^i) = f_i$.

The Lagrange polynomial $L_i(X) \in \mathbb{F}_{<n}[X]$ for $i \in [n]$ has the form
$$
L_i(X) = \frac{\omega^i\:(X^n - 1)}{n\:(X - \omega^i)}.
$$

Thus, the zero polynomial $Z_H(X) \in \mathbb{F}_{<n+1}[X]$ is defined as
$$
Z_H(X) = (X - \omega)  \cdots  (X - \omega^{n-1})(X - \omega^n) = X^n - 1.
$$

## Protocol

**Common Preprocessed Input**

\begin{align}
&n, \quad \left([1]_1, [x]_1, \dots, [x^{n+4}]_1\right).
\end{align}

**Public Input**: The value $c$ that is claimed to be the range limits.

### Prover Algorithm

**Prover Input**: A vector $\boldsymbol{f} = (f_1, f_2, \dots, f_n)$ describing the query values and a vector $\boldsymbol{t} = (t_1, t_2, \dots, t_n)$ describing the lookup (range) values.

**Round 1:**

1. Generate random blinding scalars $b_1, b_{2}, \dots, b_{(c-2) + 11}\in \mathbb{F}$.

1. Compute the query polynomial $f(X) \in \mathbb{F}_{<n+2}[X]$ and the lookup polynomial $t(X) \in \mathbb{F}_{<n}[X]$:
   \begin{align*}
   f(X) &= (b_1X+b_2)Z_H(X)+\sum_{i=1}^{n} f_iL_i(X), \\
   t(X) &= \sum_{i=1}^{n} t_iL_i(X).
   \end{align*}

1. Let $\boldsymbol{s} \in \mathbb{F}^{2n}$ be the vector that is $(\boldsymbol{f}, \boldsymbol{t})$ sorted by $\boldsymbol{t}$. We represent $\boldsymbol{s}$ by the vectors $\boldsymbol{h_1}, \boldsymbol{h_2} \in \mathbb{F}^n$ as follows:
   \begin{align*}
   \boldsymbol{h_1} &= (s_1, s_3, \dots, s_{2n-1}), \\
   \boldsymbol{h_2} &= (s_2, s_4, \dots, s_{2n}).
   \end{align*}

1. Compute the polynomials $h_1(X)\in \mathbb{F}_{<n+3}[X]$, and $h_2(X) \in \mathbb{F}_{<n+2}[X]$:
   \begin{align*}
   h_1(X) &= (b_3X^2+b_{4}X+b_5)Z_H(X) + \sum_{i=1}^{n} s_{2i-1}L_i(X), \\				                
   h_2(X) &= (b_{6}X+b_{7})Z_H(X) + \sum_{i=1}^{n} s_{2i}L_i(X).
   \end{align*}

1. Compute $[f(x)]_1$, $[h_1(x)]_1$ and $[h_2(x)]_1$.

The first output of the prover is $\left([f(x)]_1, [h_1(x)]_1, [h_2(x)]_1\right)$.

**Round 2:**

1. Compute the permutation challenge $\gamma \in \mathbb{F}_p$:
   $$
   \gamma = \mathsf{Hash}(\mathsf{transcript}).
   $$


1. Compute the permutation polynomial $z(X) \in \mathbb{F}_{<n+3}[X]$:
   \begin{align*}
   z(X) = &~(b_{8}X^2 + b_{9}X + b_{10})Z_H(X) + L_1(X) + \sum_{i=1}^{n-1} \left( L_{i+1}(X)\prod_{j=1}^{i} \frac{(\gamma+f_j)(\gamma+t_j)}{(\gamma+s_{2j-1})(\gamma+s_{2j})} \right).
   \end{align*}

1. Compute $[z(x)]_1$.

The second output of the prover is $\left([z(x)]_1\right)$.

**Round 3:**

1. Compute the quotient challenge $\alpha \in \mathbb{F}_p$
   $$
   \alpha = \mathsf{Hash}(\mathsf{transcript}),
   $$

2. Compute the quotient polynomial $q(X) \in \mathbb{F}[X]$:
   \begin{align}
   q(X) =
   \frac{1}{Z_H(x)}
   \left(
   \begin{array}{l}
   z(X)(\gamma+f(X)) (\gamma+t(X)) - z(X\omega)(\gamma+h_1(X)) (\gamma+h_2(X))\\+ (z(X)-1)L_1(X)\alpha \\+ h_1(X)L_1(X)\alpha^2 \\+ (h_2(X) - c(n-1))L_n(X)\alpha^3 \\ + P(h_2(X) - h_1(X))\alpha^4 \\ + (X - \omega^n)P(h_1(X\omega) - h_2(X))\alpha^5.
   \end{array}
   \right.
   \end{align}

:::info
**COMPUTING THE DEGREE OF $q$:**
First, notice that $\deg(P(h_2 - h_1)) = \deg(P) \cdot \deg(h_2-h_1) = (c+1)(n+2) = \deg(P(h_2))$.

There are two possibilities for the degree of $q$:
1. Case $c = 1$. In this case we have that $\deg(P(h_2 - h_1)) = 2n+4$, but then $\deg(Z \cdot h_1 \cdot h_2) = (n+2)+(n+2)+(n+1) = 3n+5$ and therefore $\deg(q) = 2n+5$.
2. Case $c \geq 2$. In this case we have that $\deg(P(h_2 - h_1)) \geq 3n+6$, which is bigger than every other degree of the polynomials included in the description of $q$. Hence, $\deg(q) = (c+1)(n+2) + 1 - n = c(n+2)+3$
   :::

:::warning
TODO: Repeat everything from this point for the case $c=1$.
:::

3. Split $q(X)$ into $c-1$ polynomials  $q_1'(X), \dots, q_{c-1}'(X)$ of degree lower than $n+3$ and another polynomial $q'_c(X)$ of degree at most $n+4$ such that:
   $$
   q(X) = q'_{1}(X) + X^{(n+2)+1}q'_{2}(X) + \dots + X^{(c-2)(n+2)+1}q'_{c-1}(X) + X^{(c-1)(n+2)+1}q'_{c}(X).
   $$

4. Define the following polynomials:
   $$
   \begin{align*}
   q_{1}(X) &:= q'_{1}(X) + b_{11}X^{(n+2)+1},\\
   q_{2}(X) &:= q'_{2}(X) − b_{11} + b_{12}X^{(n+2)+1},\\
   q_{3}(X) &:= q'_{3}(X) − b_{12} + b_{13}X^{(n+2)+1},\\
   &\vdots \\
   q_{c-1}(X) &:= q'_{c-1}(X) − b_{(c-3) + 11} + b_{(c-2)+11}X^{(n+2)+1},\\
   q_{c}(X) &:= q'_c(X) − b_{(c-2)+11}.
   \end{align*}
   $$
   :::info
   Notice that we have $q(X) = q_{1}(X) + X^{(n+2)+1}q_{2}(X) + \dots + X^{(c-2)(n+2)+1}q_{c-1}(X) + X^{(c-1)(n+2)+1}q_{c}(X)$.
   :::

5. Compute $[q_{1}(x)]_1, \dots, [q_{c-1}(x)]_1, [q_{c}(x)]_1$.

The third output of the prover is $\left([q_{1}(x)]_1, \dots, [q_{c-1}(x)]_1, [q_c(x)]_1\right)$.

**Round 4:**

1. Compute the evaluation challenge $\displaystyle \mathfrak{z} \in \mathbb{F}_p$:
   $$
   \mathfrak{z} = \mathsf{Hash}(\mathsf{transcript}),
   $$

1. Compute the opening evaluations:
   \begin{align*}
   f(\mathfrak{z}), \quad &t(\mathfrak{z}), \quad h_1(\mathfrak{z}), \quad h_2(\mathfrak{z}), \\[0.1cm]
   &z(\mathfrak{z}\omega), \quad h_1(\mathfrak{z}\omega).
   \end{align*}

The fourth output of the prover is $\left(f(\mathfrak{z}), t(\mathfrak{z}), h_1(\mathfrak{z}), h_2(\mathfrak{z}), z(\mathfrak{z}\omega), h_1(\mathfrak{z}\omega)\right)$.

**Round 5:**

1. Compute the opening challenges $v,v' \in \mathbb{F}_p$:
   $$
   v = \mathsf{Hash}(\mathsf{transcript}, 0), \quad v' = \mathsf{Hash}(\mathsf{transcript}, 1),
   $$

1. Compute the linearisation polynomial $r(X) \in \mathbb{F}_{<n+5}[X]$:
   \begin{align}
   r(X) = &~z(X) (\gamma+f(\mathfrak{z})) (\gamma+t(\mathfrak{z})) - z(\mathfrak{z}\omega)(\gamma+h_1(\mathfrak{z})) (\gamma+h_2(\mathfrak{z})) \\
   &+ \alpha(z(X)-1)L_1(\mathfrak{z}) \\
   &+ \alpha^2h_1(\mathfrak{z})L_1(\mathfrak{z}) \\
   &+ \alpha^3(h_2(\mathfrak{z}) - c(n-1))L_n(\mathfrak{z}) \\
   &+ \alpha^4P(h_2(\mathfrak{z}) - h_1(\mathfrak{z})) \\
   &+ \alpha^5(\mathfrak{z} - \omega^n)P(h_1(\mathfrak{z} \omega) - h_2(\mathfrak{z})) \\
   &- Z_H(\mathfrak{z})(q_{1}(X) + \mathfrak{z}^{(n+2)+1}q_{2}(X) + \dots + \mathfrak{z}^{(c-2)(n+2)+1}q_{c-1}(X) + \mathfrak{z}^{(c-1)(n+2)+1}q_{c}(X)).
   \end{align}

3. Compute the opening proof polynomials $W_{\mathfrak{z}}(X) \in \mathbb{F}_{<n+4}[X]$ and $W_{\mathfrak{z}\omega}(X) \in \mathbb{F}_{<n+2}[X]$:
   \begin{align*}
   W_{\mathfrak{z}}(X) &= \frac{1}{X - \mathfrak{z}}\left[r(
   X) + v(f(X) - f(\mathfrak{z})) + v^2(t(X)- t(\mathfrak{z})) + v^3(h_1(X) - h_1(\mathfrak{z})) + v^4(h_2(X) - h_2(\mathfrak{z}))\right] \\
   W_{\mathfrak{z}\omega}(X) &= \frac{1}{X - \mathfrak{z}\omega}\left[(z(X) - z(\mathfrak{z}\omega)) + v'(h_1(X)- h_1(\mathfrak{z}\omega))\right]
   \end{align*}

4. Compute $[W_{\mathfrak{z}}(x)]_1, [W_{\mathfrak{z}\omega}(x)]_1$.

The fifth output of the prover is $\left([W_{\mathfrak{z}}(x)]_1, [W_{\mathfrak{z}\omega}(x)]_1\right)$.

The complete proof is:
$$\pi =
\left(
\begin{align*}
[f(x)]_1, [h_1(x)]_1,& [h_2(x)]_1, [z(x)]_1, [q_{1}(x)]_1, \dots, [q_{c-1}(x)]_1, [q_c(x)]_1, [W_{\mathfrak{z}}(x)]_1, [W_{\mathfrak{z}\omega}(x)]_1 \\[0.1cm]
&f(\mathfrak{z}), t(\mathfrak{z}), h_1(\mathfrak{z}), h_2(\mathfrak{z}), z(\mathfrak{z}\omega), h_1(\mathfrak{z}\omega)
\end{align*}
\right).
$$

Compute multipoint evaluation challenge $u\in \mathbb{F}$:
$$
u = \mathsf{Hash}(\mathsf{transcript}),
$$


### Verifier Algorithm

**Verifier preprocessed input:** The curve element $[x]_2$.

$\mathcal{V}((t_i)_{i \in [n]},\pi):$

1. Validate that $[f(x)]_1$, $[h_1(x)]_1$, $[h_2(x)]_1$, $[z(x)]_1$, $[q_{1}(x)]_1$, $\dots$, $[q_{c-1}(x)]_1$, $[q_c(x)]_1$, $[W_\mathfrak{z}(x)]_1$, $[W_{\mathfrak{z}\omega}(x)]_1 \in \mathbb{G}_1$.

1. Validate that $f(\mathfrak{z}), t(\mathfrak{z}), h_1(\mathfrak{z}), h_2(\mathfrak{z}), z(\mathfrak{z}\omega), h_1(\mathfrak{z}\omega) \in \mathbb{F}$.

1. Validate that $(t_i)_{i\in[n]}\in\mathbb{F}^{n}$.

1. Compute the challenges $\gamma, \alpha, \mathfrak{z}, v, v', u \in \mathbb{F}$ as in prover description, from the common preprocessed inputs, public input, and elements of $\pi$.

1. Compute the zero polynomial evaluation $Z_H(\mathfrak{z}) = \mathfrak{z}^n-1$.

1. Compute the Lagrange polynomial evaluations $L_1(\mathfrak{z}) = \frac{\omega\:(\mathfrak{z}^n - 1)}{n\:(\mathfrak{z} - \omega)}$ and $L_n(\mathfrak{z}) = \frac{\omega^n\:(\mathfrak{z}^n - 1)}{n\:(\mathfrak{z} - \omega^n)}$.

1. Compute the lookup commitment $[t(x)]_1$.
> The previous computation be avoided by forcing the prover to send it.

8. To save a verifier scalar multiplication, we split $r(X)$ into its constant and non-constant terms. Compute $r(X)$'s constant term:
   \begin{align}
   r_0 := &-z(\mathfrak{z}\omega)(\gamma+h_1(\mathfrak{z}))(\gamma+h_2(\mathfrak{z}))  - \alpha L_1(\mathfrak{z}) + \alpha^2h_1(\mathfrak{z})L_1(\mathfrak{z}) +  \alpha^3(h_2(\mathfrak{z}) - c(n-1))L_n(\mathfrak{z}) \\ &+ \alpha^4P(h_2(\mathfrak{z}) - h_1(\mathfrak{z})) + \alpha^5(\mathfrak{z} - \omega^n)P(h_1(\mathfrak{z} \omega) - h_2(\mathfrak{z})),
   \end{align}
   and let $r'(X) := r(X) - r_0$.

9. Compute the first part of the batched polynomial commitment $\left[D\right]_1 := [r'(x)] + u[z(x)]_1$:
   \begin{align*}
   \left[D\right]_1 := &((\gamma+f(\mathfrak{z})) (\gamma+t(\mathfrak{z})) + L_1(\mathfrak{z})\alpha + u)[z(x)]_1 \\
   &- Z_H(\mathfrak{z})([q_{1}(x)]_1 + \mathfrak{z}^{(n+2)+1}[q_{2}(x)]_1 + \dots + \mathfrak{z}^{(c-2)(n+2)+1}[q_{c-1}(x)]_1 + \mathfrak{z}^{(c-1)(n+2)+1}[q_{c}(x)]_1).
   \end{align*}

10. Compute the full batched polynomial commitment $[F]_1$:
    \begin{align*}
    [F]_1 := ~\left[D\right]_1  & + v \cdot [f(x)]_1 + v^2 \cdot [t(x)]_1 + v^3 [h_1(x)]_1 + v^4[h_2(x)]_1 + uv'[h_1(x)]_1.
    \end{align*}

11. Compute the group-encoded batch evaluation $[E]_1$:
    $$
    [E]_1 := \bigg[-r_0 +vf(\mathfrak{z}) + v^2t(\mathfrak{z}) + v^3h_1(\mathfrak{z}) + v^4h_2(\mathfrak{z}) + u\left(z(\mathfrak{z}\omega) + v'h_1(\mathfrak{z}\omega)\right)\bigg]_1
    $$

12. Finally, batch validate all evaluations:
    $$
    e\left([W_\mathfrak{z}(x)]_1+u\cdot[W_{\mathfrak{z}\omega}(x)]_1, [x]_2\right) \stackrel{?}{=} e\left(\mathfrak{z}\cdot [W_\mathfrak{z}(x)]_1+u\mathfrak{z}\omega\cdot[W_{\mathfrak{z}\omega}(x)]_1 + [F]_1 - [E]_1, [1]_2\right).
    $$

###### tags: `Plookup`