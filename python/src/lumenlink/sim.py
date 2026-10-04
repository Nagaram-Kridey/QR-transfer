"""Seeded channel model. Results are simulations, never camera benchmarks."""

import random
from dataclasses import asdict, dataclass

from .container import prepare_container
from .repeat import Receiver, Transfer


@dataclass(frozen=True)
class SimulationResult:
    kind: str
    seed: int
    payload_bytes: int
    symbol_size: int
    symbols: int
    displayed: int
    received: int
    duplicates: int
    complete: bool
    loss: float
    max_cycles: int

    def to_dict(self) -> dict[str, str | int | float | bool]:
        return asdict(self)


def simulate(
    data: bytes,
    *,
    seed: int = 0,
    loss: float = 0.3,
    duplicates: float = 0.1,
    reorder_window: int = 4,
    burst_every: int = 0,
    burst_length: int = 0,
    max_cycles: int = 20,
    symbol_size: int = 256,
) -> SimulationResult:
    if not 0 <= loss <= 1 or not 0 <= duplicates <= 1:
        raise ValueError("Loss and duplication probabilities must be in [0, 1]")
    if not 1 <= reorder_window <= 64 or not 1 <= max_cycles <= 1000:
        raise ValueError("Invalid bounded simulation budget")
    if burst_every < 0 or burst_length < 0 or burst_length > burst_every:
        raise ValueError("Invalid burst settings")
    transfer = Transfer(
        prepare_container(data, "simulation.bin", created=0), symbol_size, bytes(16)
    )
    receiver = Receiver()
    rng = random.Random(seed)
    pending: list[str] = []
    displayed = 0
    budget = max_cycles * transfer.k
    # Start at a random phase: no assumption that the receiver sees the first frame.
    start = rng.randrange(transfer.k)
    for offset in range(budget):
        displayed += 1
        burst = burst_every > 0 and offset % burst_every < burst_length
        if not burst and rng.random() >= loss:
            text = transfer.text(start + offset)
            pending.append(text)
            if rng.random() < duplicates:
                pending.append(text)
        if displayed % reorder_window == 0 or displayed == budget:
            rng.shuffle(pending)
            for text in pending:
                result = receiver.ingest(text)
                if result is not None:
                    assert result.data == data
                    break
            pending.clear()
        if receiver.state == "DONE":
            break
    return SimulationResult(
        "simulation",
        seed,
        len(data),
        symbol_size,
        transfer.k,
        displayed,
        receiver.seen,
        receiver.duplicates,
        receiver.state == "DONE",
        loss,
        max_cycles,
    )
