"""Die Drohne: Jeder Befehl bewegt die Drohne auf der Karte."""

import sys

import _drone_js

_MISSION = "<mission>"


class DroneStop(BaseException):
    """Stoppt das Programm, wenn die Drohne nicht weiterfliegen kann."""


def _line():
    frame = sys._getframe(1)
    while frame is not None and frame.f_code.co_filename != _MISSION:
        frame = frame.f_back
    return frame.f_lineno if frame is not None else 0


def _do(name, *args):
    if not _drone_js.call(name, _line(), *args):
        raise DroneStop()


def takeoff():
    """Hebt ab."""
    _do("takeoff")


def land():
    """Landet auf dem Feld unter der Drohne."""
    _do("land")


def forward(steps=1):
    """Fliegt `steps` Felder nach vorne."""
    _do("forward", steps)


def turn_left():
    """Dreht die Drohne nach links."""
    _do("turn_left")


def turn_right():
    """Dreht die Drohne nach rechts."""
    _do("turn_right")


def pick_up():
    """Nimmt das Paket unter der Drohne auf."""
    _do("pick_up")


def drop():
    """Gibt das Paket ab."""
    _do("drop")


def photo():
    """Macht ein Foto vom Feld unter der Drohne."""
    _do("photo")


def obstacle_ahead():
    """True, wenn vor der Drohne ein Gebäude oder das Kartenende ist."""
    result = _drone_js.sense("obstacle_ahead", _line())
    if result is None:
        raise DroneStop()
    return bool(result)


__all__ = ["takeoff", "land", "forward", "turn_left", "turn_right", "pick_up", "drop", "photo", "obstacle_ahead"]
