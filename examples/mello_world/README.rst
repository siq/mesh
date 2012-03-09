"Mello World" -- a very simple Mesh resource
============================================

To run this example from the command-line, make sure the
`mesh` library is in your `PYTHONPATH`, then from this
directory run:

    python run.py client|server [options] [args]

Client interaction
------------------

The simplest is
    python run.py client --local

which uses a standalone server connected locally. Either
way, in the absense of other arguments a console interface
is opened, which demonstrates the ridiculously simple
service interaction.

Or, for an even quicker demo:

    python run.py client --local Bob Mary Jozsef

