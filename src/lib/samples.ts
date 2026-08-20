/* Sample source documents so the full pipeline can be tried in one click. */

export interface SampleDoc {
  id: string;
  name: string;
  hint: string;
  text: string;
}

export const SAMPLES: SampleDoc[] = [
  {
    id: "nn-lecture",
    name: "Lecture outline — How Neural Networks Learn",
    hint: "Markdown headings · 8 sections · stats + quote",
    text: `# How Neural Networks Learn

A compact lecture outline for a first course in machine learning. The goal is to build an honest mental model of what "training" actually means: no magic, just calculus and bookkeeping. By the end, students should be able to explain a training loop to a friend in plain language.

## What Is a Neural Network?

A neural network is a function made of stacked, tunable layers. Each layer multiplies its input by a matrix of weights, adds a bias, and pushes the result through a non-linear activation. The network starts out knowing nothing: its weights are random noise. Learning is the process of replacing that noise with numbers that make useful predictions.

## Layers, Weights, and Signals

The input layer receives raw features such as pixels or word tokens. Hidden layers transform the signal into increasingly abstract representations: edges become shapes, shapes become objects. The output layer produces a prediction, like a probability for each class. A modern large model may hold 175 billion parameters, but each one is just a single scalar multiplier.

## The Forward Pass

During the forward pass, data flows left to right through the network and a prediction comes out the other side. Every weight touches the signal exactly once per pass. The forward pass is pure arithmetic; nothing is learned until the prediction is compared against the truth.

## Loss: Measuring Mistakes

A loss function converts "how wrong the prediction was" into a single number. Classification tasks usually use cross-entropy, while regression tasks use mean squared error. The loss is the compass of training: everything the network does next is aimed at making this number smaller.

## Backpropagation

Backpropagation applies the chain rule of calculus to assign blame for the loss to every weight in the network. Each weight receives a gradient: a direction and magnitude that says how much the loss would change if the weight moved. The algorithm is exact, not approximate, and it runs backwards from the output layer to the input layer.

"Neural networks don't learn rules — they adjust millions of tiny dials until the mistakes get smaller." — adapted from a first-lecture note

## Gradient Descent in Practice

Gradient descent nudges every weight a small step against its gradient, then repeats. The step size is the learning rate, often around 0.001, and choosing it badly is the most common way to stall training. On the MNIST digit dataset, a small two-layer network reaches about 98.6% accuracy in a few minutes on a laptop. Mini-batches and momentum turn the naive loop into the optimizer used in production today.

## Overfitting and Regularization

A network can memorize the training set instead of learning the pattern; that is overfitting. The classic warning sign is a loss that keeps falling on training data while validation loss rises. Dropout, weight decay, and more data are the standard defenses. The real skill is reading the two loss curves and knowing when to stop training.

## Key Takeaways

A network is a tunable function, not a brain. Training is a loop: forward pass, loss, backpropagation, update. Gradients assign blame; the learning rate decides how loudly the network listens. Overfitting is the evergreen failure mode, and validation data is how you catch it.`,
  },
  {
    id: "tool-library",
    name: "Field notes — Launching a Community Tool Library",
    hint: "Plain-text caps headings · numbers & pull-quote",
    text: `THE CASE FOR A COMMUNITY TOOL LIBRARY

These are the working notes from our first year running a neighborhood tool library: what we lent, what broke, what we'd do differently. Most households own a drill that is used for about 13 minutes in its entire lifetime. A tool library turns that idle metal into shared infrastructure.

WHY TOOLS SIT IDLE

The average garage holds over $3,000 of rarely used equipment. Ladders, tile cutters and carpet cleaners are bought for a single weekend project and then stored for a decade. Borrowing is cheaper, greener, and it gives neighbors a reason to talk to each other. The product is not the drill — the product is the hole, plus a slightly stronger community.

THE MEMBERSHIP MODEL

We charge $40 per year for unlimited borrowing, with a refundable deposit on high-value items. Members reserve tools through a simple spreadsheet for the first six months, then a small web app. About 87% of members renew after the first year, which tells us the value is obvious once experienced. Volunteers run two lending evenings per week, three hours each.

NUMBERS FROM YEAR ONE

We opened with 420 donated tools and closed the year with 2,300 catalogued items. Loans totalled 4,150, with a 96% on-time return rate before we introduced gentle reminder emails. Replacement costs ran to $1,850 against $11,200 in membership income, and member surveys estimated $41,000 of avoided purchases. The break-even point arrived in month nine.

OPERATIONS THAT KEEP IT RUNNING

Every tool gets a barcode, a condition card, and a laminated one-page guide. Check-out takes under two minutes once the catalog is clean. The two rules that matter most: report damage immediately and there is no penalty, and late returns simply pause borrowing until the item is back. Trust, enforced softly, beats fines enforced harshly.

"A tool library is a trust engine wearing a shed's clothes." — founding member, first annual meeting

PITFALLS WE HIT

We under-estimated consumables: drill bits, saw blades and sandpaper disappear faster than tools. Insurance was harder to arrange than the venue; a community umbrella policy finally covered us. Our first catalog was too ambitious, listing items before they were tested, which produced two embarrassing "sorry, it's broken" evenings. Test everything before it gets a barcode.

NEXT TWELVE MONTHS

The plan is a second neighborhood branch run on the same playbook, a repair café once a month, and a lending shelf for camping gear ahead of summer. We want to push the renewal rate past 90% and cut no-show reservations with a small waitlist feature. If the numbers hold, the model funds itself — the shed pays for the shed.`,
  },
];
