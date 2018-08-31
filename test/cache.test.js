import test from "ava";
import fs from "fs";
import path from "path";
import rimraf from "rimraf";
import webpack from "webpack";
import createTestDirectory from "./helpers/createTestDirectory";

const defaultCacheDir = path.join(
  __dirname,
  "../node_modules/.cache/babel-loader",
);
const cacheDir = path.join(__dirname, "output/cache/cachefiles");
const outputDir = path.join(__dirname, "output/cache");
const babelLoader = path.join(__dirname, "../lib");

const globalConfig = {
  mode: "development",
  entry: path.join(__dirname, "fixtures/basic.js"),
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: babelLoader,
        exclude: /node_modules/,
      },
    ],
  },
};

// Create a separate directory for each test so that the tests
// can run in parallel

test.cb.beforeEach(t => {
  createTestDirectory(outputDir, t.title, (err, directory) => {
    if (err) return t.end(err);
    t.context.directory = directory;
    t.end();
  });
});
test.cb.beforeEach(t => {
  createTestDirectory(cacheDir, t.title, (err, directory) => {
    if (err) return t.end(err);
    t.context.cacheDirectory = directory;
    t.end();
  });
});
test.cb.beforeEach(t => rimraf(defaultCacheDir, t.end));
test.cb.afterEach(t => rimraf(t.context.directory, t.end));
test.cb.afterEach(t => rimraf(t.context.cacheDirectory, t.end));

test.cb("should output files to cache directory", t => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: babelLoader,
          exclude: /node_modules/,
          options: {
            cacheDirectory: t.context.cacheDirectory,
            presets: ["@gerhobbelt/babel-preset-env"],
          },
        },
      ],
    },
  });

  webpack(config, (err, stats) => {
    t.is(err, null);
    t.is(stats.compilation.errors.length, 0);
    t.is(stats.compilation.warnings.length, 0);

    fs.readdir(t.context.cacheDirectory, (err, files) => {
      t.is(err, null);
      t.true(files.length > 0);
      t.end();
    });
  });
});

test.cb.serial(
  "should output json.gz files to standard cache dir by default",
  t => {
    const config = Object.assign({}, globalConfig, {
      output: {
        path: t.context.directory,
      },
      module: {
        rules: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            options: {
              cacheDirectory: true,
              presets: ["@gerhobbelt/babel-preset-env"],
            },
          },
        ],
      },
    });

    webpack(config, (err, stats) => {
      t.is(err, null);
      t.is(stats.compilation.errors.length, 0);
      t.is(stats.compilation.warnings.length, 0);

      fs.readdir(defaultCacheDir, (err, files) => {
        files = files.filter(file => /\b[0-9a-f]{5,40}\.json\.gz\b/.test(file));

        t.is(err, null);
        t.true(files.length > 0);
        t.end();
      });
    });
  },
);

test.cb.serial(
  "should output files to standard cache dir if set to true in query",
  t => {
    const config = Object.assign({}, globalConfig, {
      output: {
        path: t.context.directory,
      },
      module: {
        rules: [
          {
            test: /\.jsx?/,
            loader: `${babelLoader}?cacheDirectory=true&presets[]=@gerhobbelt/babel-preset-env`,
            exclude: /node_modules/,
          },
        ],
      },
    });

    webpack(config, (err, stats) => {
      t.is(err, null);
      t.is(stats.compilation.errors.length, 0);
      t.is(stats.compilation.warnings.length, 0);

      fs.readdir(defaultCacheDir, (err, files) => {
        files = files.filter(file => /\b[0-9a-f]{5,40}\.json\.gz\b/.test(file));

        t.is(err, null);

        t.true(files.length > 0);
        t.end();
      });
    });
  },
);

test.cb.skip("should read from cache directory if cached file exists", t => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
    module: {
      rules: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          exclude: /node_modules/,
          options: {
            cacheDirectory: t.context.cacheDirectory,
            presets: ["@gerhobbelt/babel-preset-env"],
          },
        },
      ],
    },
  });

  // @TODO Find a way to know if the file as correctly read without relying on
  // Istanbul for coverage.
  webpack(config, (err, stats) => {
    t.is(err, null);
    t.is(stats.compilation.errors.length, 0);
    t.is(stats.compilation.warnings.length, 0);

    webpack(config, err => {
      t.is(err, null);
      fs.readdir(t.context.cacheDirectory, (err, files) => {
        t.is(err, null);
        t.true(files.length > 0);
        t.end();
      });
    });
  });
});

test.cb("should have one file per module", t => {
  const config = Object.assign({}, globalConfig, {
    output: {
      path: t.context.directory,
    },
    module: {
      rules: [
        {
          test: /\.jsx?/,
          loader: babelLoader,
          exclude: /node_modules/,
          options: {
            cacheDirectory: t.context.cacheDirectory,
            presets: ["@gerhobbelt/babel-preset-env"],
          },
        },
      ],
    },
  });

  webpack(config, (err, stats) => {
    t.is(err, null);
    t.is(stats.compilation.errors.length, 0);
    t.is(stats.compilation.warnings.length, 0);

    fs.readdir(t.context.cacheDirectory, (err, files) => {
      t.is(err, null);
      t.true(files.length === 3);
      t.end();
    });
  });
});

test.cb("should generate a new file if the identifier changes", t => {
  const configs = [
    Object.assign({}, globalConfig, {
      output: {
        path: t.context.directory,
      },
      module: {
        rules: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            options: {
              cacheDirectory: t.context.cacheDirectory,
              cacheIdentifier: "a",
              presets: ["@gerhobbelt/babel-preset-env"],
            },
          },
        ],
      },
    }),
    Object.assign({}, globalConfig, {
      output: {
        path: t.context.directory,
      },
      module: {
        rules: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            options: {
              cacheDirectory: t.context.cacheDirectory,
              cacheIdentifier: "b",
              presets: ["@gerhobbelt/babel-preset-env"],
            },
          },
        ],
      },
    }),
  ];
  let counter = configs.length;

  configs.forEach(config => {
    webpack(config, (err, stats) => {
      t.is(err, null);
      t.is(stats.compilation.errors.length, 0);
      t.is(stats.compilation.warnings.length, 0);
      counter -= 1;

      if (!counter) {
        fs.readdir(t.context.cacheDirectory, (err, files) => {
          t.is(err, null);
          t.true(files.length === 6);
          t.end();
        });
      }
    });
  });
});

test.cb("should allow to specify the .babelrc file", t => {
  const config = [
    Object.assign({}, globalConfig, {
      entry: path.join(__dirname, "fixtures/constant.js"),
      output: {
        path: t.context.directory,
      },
      module: {
        rules: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            options: {
              cacheDirectory: t.context.cacheDirectory,
              extends: path.join(__dirname, "fixtures/babelrc"),
              babelrc: false,
              presets: ["@gerhobbelt/babel-preset-env"],
            },
          },
        ],
      },
    }),
    Object.assign({}, globalConfig, {
      entry: path.join(__dirname, "fixtures/constant.js"),
      output: {
        path: t.context.directory,
      },
      module: {
        rules: [
          {
            test: /\.jsx?/,
            loader: babelLoader,
            exclude: /node_modules/,
            options: {
              cacheDirectory: t.context.cacheDirectory,
              presets: ["@gerhobbelt/babel-preset-env"],
            },
          },
        ],
      },
    }),
  ];

  webpack(config, (err, multiStats) => {
    t.is(err, null);
    t.is(multiStats.stats[0].compilation.errors.length, 0);
    t.is(multiStats.stats[0].compilation.warnings.length, 0);
    t.is(multiStats.stats[1].compilation.errors.length, 0);
    t.is(multiStats.stats[1].compilation.warnings.length, 0);

    fs.readdir(t.context.cacheDirectory, (err, files) => {
      t.is(err, null);
      t.true(files.length === 2);
      t.end();
    });
  });
});
