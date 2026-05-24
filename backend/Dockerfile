FROM golang:1.25-alpine AS build
WORKDIR /app
COPY go.mod ./
COPY . .
RUN go build -o /out/tandaza-api ./cmd/api

FROM alpine:3.20
WORKDIR /app
COPY --from=build /out/tandaza-api /app/tandaza-api
EXPOSE 8080
CMD ["/app/tandaza-api"]
