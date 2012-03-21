from distutils.core import setup

setup(
    name='mesh',
    version='1.0.0a1',
    description='A declarative RESTful API framework.',
    author='Jordan McCoy',
    author_email='mccoy.jordan@gmail.com',
    license='BSD',
    url='http://github.com/siq/mesh',
    packages=[
        'mesh',
        'mesh.binding',
        'mesh.documentation',
        'mesh.standard',
        'mesh.transport',
    ],
    package_data={
        'mesh.binding': ['templates/*'],
        'mesh.documentation': ['templates/*'],
    },
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: BSD License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Topic :: Software Development :: Code Generators',
        'Topic :: Software Development :: Libraries :: Application Frameworks',
        'Topic :: Software Development :: Libraries :: Python Modules',
    ]
)
