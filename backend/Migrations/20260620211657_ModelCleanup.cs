using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class ModelCleanup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RegistrosPonto_Academicos_AcademicoId",
                table: "RegistrosPonto");

            migrationBuilder.DropIndex(
                name: "IX_RegistrosPonto_AcademicoId",
                table: "RegistrosPonto");

            migrationBuilder.DropColumn(
                name: "TotalTrabalhado",
                table: "RegistrosPonto");

            migrationBuilder.RenameColumn(
                name: "Data",
                table: "RegistrosPonto",
                newName: "UpdatedAt");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "RegistrosPonto",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AlterColumn<string>(
                name: "Senha",
                table: "Academicos",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Nome",
                table: "Academicos",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Matricula",
                table: "Academicos",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            // conversão manual necessária porque PostgreSQL não converte text → time automaticamente
            migrationBuilder.Sql("""
                ALTER TABLE "Academicos"
                ALTER COLUMN "HorarioSaida" TYPE time without time zone
                USING CASE WHEN "HorarioSaida" = '' THEN NULL ELSE "HorarioSaida"::time without time zone END,
                ALTER COLUMN "HorarioSaida" DROP NOT NULL;
            """);

            migrationBuilder.Sql("""
                ALTER TABLE "Academicos"
                ALTER COLUMN "HorarioEntrada" TYPE time without time zone
                USING CASE WHEN "HorarioEntrada" = '' THEN NULL ELSE "HorarioEntrada"::time without time zone END,
                ALTER COLUMN "HorarioEntrada" DROP NOT NULL;
            """);

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Academicos",
                type: "character varying(320)",
                maxLength: 320,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Academicos",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Academicos",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateIndex(
                name: "IX_RegistrosPonto_AcademicoId_HoraEntrada",
                table: "RegistrosPonto",
                columns: new[] { "AcademicoId", "HoraEntrada" });

            migrationBuilder.AddForeignKey(
                name: "FK_RegistrosPonto_Academicos_AcademicoId",
                table: "RegistrosPonto",
                column: "AcademicoId",
                principalTable: "Academicos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RegistrosPonto_Academicos_AcademicoId",
                table: "RegistrosPonto");

            migrationBuilder.DropIndex(
                name: "IX_RegistrosPonto_AcademicoId_HoraEntrada",
                table: "RegistrosPonto");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "RegistrosPonto");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Academicos");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Academicos");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "RegistrosPonto",
                newName: "Data");

            migrationBuilder.AddColumn<TimeSpan>(
                name: "TotalTrabalhado",
                table: "RegistrosPonto",
                type: "interval",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Senha",
                table: "Academicos",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "Nome",
                table: "Academicos",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "Matricula",
                table: "Academicos",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "HorarioSaida",
                table: "Academicos",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(TimeOnly),
                oldType: "time without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "HorarioEntrada",
                table: "Academicos",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(TimeOnly),
                oldType: "time without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Academicos",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(320)",
                oldMaxLength: 320);

            migrationBuilder.CreateIndex(
                name: "IX_RegistrosPonto_AcademicoId",
                table: "RegistrosPonto",
                column: "AcademicoId");

            migrationBuilder.AddForeignKey(
                name: "FK_RegistrosPonto_Academicos_AcademicoId",
                table: "RegistrosPonto",
                column: "AcademicoId",
                principalTable: "Academicos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
