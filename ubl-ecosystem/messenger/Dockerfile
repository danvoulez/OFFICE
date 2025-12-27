# Messenger - Chat application using OFFICE and UBL
# Multi-stage build for smaller final image

FROM rust:1.75-bookworm AS builder

WORKDIR /app

# Copy office crate first (dependency)
COPY office /app/office

# Copy messenger manifests
COPY messenger/Cargo.toml messenger/Cargo.lock* ./

# Create dummy src for dependency compilation
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies only
RUN cargo build --release
RUN rm -rf src

# Copy actual source code
COPY messenger/src ./src
COPY messenger/config ./config

# Build the actual application
RUN touch src/main.rs && cargo build --release

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/messenger /app/messenger
COPY --from=builder /app/config /app/config

# Create non-root user
RUN useradd -r -s /bin/false messenger
USER messenger

EXPOSE 8081

ENV RUST_LOG=info
ENV MESSENGER_CONFIG=/app/config/production.toml

CMD ["/app/messenger"]
