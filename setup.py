from distutils.core import setup

setup(
    name='mesh',
    version='1.0.a1',
    description='A declarative RESTful API framework.',
    author='Jordan McCoy',
    author_email='mccoy.jordan@gmail.com',
    license='BSD',
    url='http://github.com/jordanm/mesh',
    packages=[
        'mesh',
        'mesh.documentation',
        'mesh.interface',
        'mesh.standard',
        'mesh.transport',
    ],
)
