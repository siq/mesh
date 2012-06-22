import os
from distutils.core import setup

version = '1.0.0'
try:
    revision = os.environ['REVISION']
except Exception:
    pass
else:
    version = revision

packages = []
for root, dirs, files in os.walk('mesh'):
    if '__init__.py' in files:
        packages.append(root.replace('/', '.'))

setup(
    name='mesh',
    version=version,
    description='A declarative RESTful API framework.',
    author='Jordan McCoy',
    author_email='mccoy.jordan@gmail.com',
    license='BSD',
    url='http://github.com/siq/mesh',
    packages=packages,
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
